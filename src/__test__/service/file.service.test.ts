import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {FileService} from "../../service/file.service";
import {AuthService} from "../../service/auth.service";

const authService = {getToken: async () => "token"} as unknown as AuthService;
const fetchMock = vi.fn();

const reply = (body: any) => ({ok: true, status: 200, json: async () => body});
const added = (id: string, name: string) =>
  reply({data: {addFile: {__typename: "AddFile", id, name, userId: "p1", fileCategory: "contract", createdAt: "2026-10-17"}}});
const file = (name: string) => new File(["x"], name, {type: "application/pdf"});
const operations = (call: number) => JSON.parse((fetchMock.mock.calls[call][1].body as FormData).get("operations") as string);

describe("FileService.uploadContractDocuments", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uploads every selected file, one request per file", async () => {
    fetchMock.mockResolvedValueOnce(added("f1", "a.pdf")).mockResolvedValueOnce(added("f2", "b.pdf"));
    const r = await new FileService(authService).uploadContractDocuments("TE1", "p1", [file("a.pdf"), file("b.pdf")]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r.map(f => f.id)).toEqual(["f1", "f2"]);
    expect((fetchMock.mock.calls[1][1].body as FormData).get("0")).toHaveProperty("name", "b.pdf");
    const op = operations(1);
    expect(op.variables.name).toBe("b.pdf");
    expect(op.query).toContain('fileCategory: "contract"');
    expect(op.query).toContain('attributes: [{key: "category_tag", value: "user"}]');
  });

  it("passes the file name as a variable, not inside the query", async () => {
    fetchMock.mockResolvedValueOnce(added("f1", 'Vertrag "neu".pdf'));
    await new FileService(authService).uploadContractDocuments("TE1", "p1", [file('Vertrag "neu".pdf')]);
    const op = operations(0);
    expect(op.variables.name).toBe('Vertrag "neu".pdf');
    expect(op.query).not.toContain("Vertrag");
  });

  it("rejects with the AddFileError message and still uploads the other files", async () => {
    fetchMock
      .mockResolvedValueOnce(reply({data: {addFile: {__typename: "AddFileError", message: "Invalid content_type"}}}))
      .mockResolvedValueOnce(added("f2", "b.pdf"));
    await expect(new FileService(authService).uploadContractDocuments("TE1", "p1", [file("a.png"), file("b.pdf")]))
      .rejects.toThrow("a.png: Invalid content_type");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects on GraphQL errors", async () => {
    fetchMock.mockResolvedValueOnce(reply({data: null, errors: [{message: "Forbidden"}]}));
    await expect(new FileService(authService).uploadContractDocuments("TE1", "p1", [file("a.pdf")]))
      .rejects.toThrow("a.pdf: Forbidden");
  });
});
