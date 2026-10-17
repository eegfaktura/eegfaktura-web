
const EegQuery = `{
  eeg()
}`;

export const eegGraphqlQuery = {
    operationName: null,
    query: `query EegInfo ${EegQuery}`,
    variables: {},
};

const EnergyQuery = (tenant: string, year: number, month: number) => `{
  eeg(name:"${tenant}", year:${year}, month: ${month})
}`; // graphQl Query

export const energyGraphqlQuery = (tenant: string, year: number, month: number) => {
  return {
    operationName: null,
    query: `query EnergyInfo ${EnergyQuery(tenant.toLowerCase(), year, month)}`,
    variables: {},
  }
};

const ReportDateQuery = (tenant: string, ecId: string) => `{
  lastEnergyDate(tenant:"${tenant}", ecId: "${ecId}")
}`; // graphQl Query

export const reportDateGraphqlQuery = (tenant: string, ecId: string) => {
  return {
    operationName: null,
    query: `query ReportDate ${ReportDateQuery(tenant.toLowerCase(), ecId)}`,
    variables: {},
  }
};

const UploadEneryMutation = (tenant: string, ecId: string, sheet: string) => `{
  singleUpload(tenant: "${tenant}", ecId: "${ecId}", sheet: "${sheet}", file: $energyData)
}`; // graphQl Query

export const uploadEnergyGraphqlMutation = async (tenant: string, ecId: string, sheet: string, data: File) => {

  const fileToBlob = async (file: File) => new Blob([new Uint8Array(await file.arrayBuffer())], {type: file.type });

  const formData = new FormData();

  formData.append("operations", JSON.stringify({
    operationName: null,
    query: `mutation ($energyData: Upload!) ${UploadEneryMutation(tenant.toLowerCase(), ecId, sheet)}`,
    variables: {"energyData": null},
  }))
  formData.append("map", JSON.stringify({"0": ["variables.energyData"]}))
  formData.append("0", data)

  return formData;
};

export const loadContractFilesQuery = (tenant: string, participantId: string) => {
  return {
    operationName: null,
    query: `query QueryContracts {
      files(tenant: "${tenant}", userId: "${participantId}", category: "contract", attributes: [{key:"category_tag", value: "user"}]) {
        id
        userId
        name
        fileCategory
        attributes {
          key
          value
        }
        fileDownloadUri
        createdAt
      }}`,
    variables: {},
  }
};

export const uploadContractFileMutation = (tenant: string, file: File, participantId: string) => {

  // const fileToBlob = async (file: File) => {
  //   new Blob([new Uint8Array(await file.arrayBuffer())], {type: file.type });
  // }

  const formData = new FormData();

  formData.append("operations", JSON.stringify({
    query: `mutation StoreContract ($file: Upload!, $name: String!) {
      addFile(
        tenant: "${tenant}"
        file: $file
        fileCategory: "contract"
        attributes: [{key: "category_tag", value: "user"}]
        name: $name
        userId: "${participantId}"
      ) {
        __typename
        ... on AddFile {
              id
              name
              userId
              fileCategory
              fileDownloadUri
              createdAt
        }
        ... on AddFileError {
              message
        }
      }
    }`,
    variables: {"file": null, "name": file.name},
    operationName: "StoreContract"
  }))
  formData.append("map", JSON.stringify({"0": ["variables.file"]}))
  formData.append("0", file)

  return formData;
};


export const deleteContractFilesMutation = (fileId: string) => {
  return {
    operationName: "DeleteFile",
    query: `mutation DeleteFile {
deleteFile(fileId: "${fileId}") {
  ... on DeleteFileError {
      message
    }
  }
}`,
    variables: {},
  }
};