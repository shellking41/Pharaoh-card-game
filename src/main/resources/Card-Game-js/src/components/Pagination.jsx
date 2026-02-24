// components/Pagination.jsx
import React from 'react';
import styles from './styles/Pagination.module.css';

function Pagination({ currentPage, totalPages, onPageChange }) {
    const pages = [];

    // Maximum 5 oldalszám megjelenítése
    //HA tul menne a currentPage - 2 akkor azt jelenti hogy az elso vagy a masodik lapon vagyunk
    let startPage = Math.max(0, currentPage - 2);
    //HA tul menne a currentPage + 2 akkor azt jelenti hogy az utolso vagy az utoslo elotti lapon vagyunk
    let endPage = Math.min(totalPages - 1, currentPage + 2);

    //ha elso,masodik,utoso,utolso elotti
    if (endPage - startPage < 4) {
        //ez eldonti hogy most elso masodik, VAGY utolso utolso elotti helyen van e a current page es az alapjankorigal
        if (currentPage < totalPages / 2) {
            endPage = Math.min(totalPages - 1, startPage + 4);
        } else {
            startPage = Math.max(0, endPage - 4);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    if (totalPages <= 1) return null;

    return (
        <div className={styles.pagination}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className={styles.pageButton}
            >
                &laquo; Previous
            </button>

            {startPage > 0 && (
                <>
                    <button
                        onClick={() => onPageChange(0)}
                        className={styles.pageButton}
                    >
                        1
                    </button>
                    {startPage > 1 && <span className={styles.ellipsis}>...</span>}
                </>
            )}

            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
                >
                    {page + 1}
                </button>
            ))}

            {endPage < totalPages - 1 && (
                <>
                    {endPage < totalPages - 2 && <span className={styles.ellipsis}>...</span>}
                    <button
                        onClick={() => onPageChange(totalPages - 1)}
                        className={styles.pageButton}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className={styles.pageButton}
            >
                Next &raquo;
            </button>
        </div>
    );
}

export default Pagination;