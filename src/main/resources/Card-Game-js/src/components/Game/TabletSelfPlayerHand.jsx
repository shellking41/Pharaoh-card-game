import React, {useEffect, useState} from 'react'
import HungarianCard from "./HungarianCard.jsx";
import MobileSelfPlayerHand from "./MobileSelfPlayerHand.jsx";

function TableSelfPlayerHand({
                                  initialCards = [], selectedCards = [], handleCardClick = () => {
    },
                              }) {

    return (
        <>
            <MobileSelfPlayerHand
                initialCards={initialCards}
                selectedCards={selectedCards}
                handleCardClick={handleCardClick}
            />
        </>
    )
}

export default TableSelfPlayerHand
