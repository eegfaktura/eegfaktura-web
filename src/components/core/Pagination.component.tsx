import {ChangeEventHandler, FC, ReactNode, useEffect, useState} from "react";
import {set} from "react-hook-form";
import {IonButton, IonGrid, IonIcon, IonRow} from "@ionic/react";
import {eegChevronLeft, eegChevronRight, eegFirstPage, eegLastPage} from "../../eegIcons";


export interface ItemContent<D> {
  (index: number, data: D): ReactNode
}


interface PaginationComponentProp {
  elements: Array<Object>
  perPage: number
  renderEntry: ItemContent<any>
}


const PaginationComponent: FC<PaginationComponentProp> = ({elements, perPage, renderEntry}) => {

  const [currentPage, setCurrentPage] = useState<number>(1)
  const [error, setError] = useState("");

  useEffect(() => {
    setCurrentPage(1)
    setError("")
  }, [elements]);

  const paginate = () => {
    const offset = perPage * (currentPage - 1);
    const totalPages = Math.ceil(elements.length / perPage);
    const paginatedItems = elements.slice(offset, perPage * currentPage);

    return {
      previousPage: currentPage - 1 ? currentPage - 1 : null,
      nextPage: (totalPages > currentPage) ? currentPage + 1 : null,
      total: elements.length,
      totalPages: totalPages,
      items: paginatedItems
    }
  }

  const pageView = paginate()

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pageView.totalPages) {
      setCurrentPage(page);
      setError("");
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pageView.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
      <IonButton key={i} shape="round"
                 size="small"
                 onClick={() => handlePageChange(i)}
                 disabled={currentPage === i}
                 aria-label="Go to previous page">
        {i}
      </IonButton>
      );
    }

    return pageNumbers;
  };

  return (
    <>
      {pageView.items.map((e, i) =>
        renderEntry(i, e)
      )}
      <IonGrid aria-label="Pagination">
        <IonRow className={"ion-justify-content-end"}>
          <IonButton shape="round"
                     size="small"
                     onClick={() => handlePageChange(1)}
                     disabled={currentPage === 1}
                     aria-label="Go to first page">
            <IonIcon slot="icon-only" icon={eegFirstPage}></IonIcon>
          </IonButton>
          <IonButton shape="round"
                     size="small"
                     onClick={() => handlePageChange(currentPage - 1)}
                     disabled={currentPage === 1}
                     aria-label="Go to previous page">
            <IonIcon slot="icon-only" icon={eegChevronLeft}></IonIcon>
          </IonButton>
          <div className="flex items-center space-x-1">{renderPageNumbers()}</div>
          <IonButton shape="round"
                     size="small"
                     onClick={() => handlePageChange(currentPage + 1)}
                     disabled={currentPage === pageView.totalPages}
                     aria-label="Go to previous page">
            <IonIcon slot="icon-only" icon={eegChevronRight}></IonIcon>
          </IonButton>
          <IonButton shape="round"
                     size="small"
                     onClick={() => handlePageChange(pageView.totalPages)}
                     disabled={currentPage === pageView.totalPages}
                     aria-label="Go to previous page">
            <IonIcon slot="icon-only" icon={eegLastPage}></IonIcon>
          </IonButton>
        </IonRow>
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </IonGrid>
    </>
  )
}

export default PaginationComponent;