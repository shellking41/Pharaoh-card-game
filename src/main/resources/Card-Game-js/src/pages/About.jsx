import React, { useState } from 'react'
import styles from "./styles/About.module.css"
import {useNavigate} from "react-router-dom";

function About() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const totalSlides = 13;
const navigate=useNavigate();
    const toRight = () => {
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
    };

    const toLeft = () => {
        setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    const slides = [
        {
            title: "Room Creation",
            img: "/src/assets/home_page.png",
            text: "Create your own game room by clicking the 'Create New Room' button. Choose a unique room name and optionally set a password to control who can join. Your room will appear in the lobby for other players to discover and request to join."
        },
        {
            title: "Room Joining",
            img: "/src/assets/Home_page2.png",
            text: "Browse available rooms in the lobby and select one to join. If the room is password-protected, you'll need to enter the correct password. You can also include an optional message to introduce yourself to the room's gamemaster when requesting to join."
        },
        {
            title: "Room Page",
            img: "/src/assets/Room_page1.png",
            text: "Once in a room, you'll see all current participants and you have to wait for the game to start. The gamemaster has special privileges to manage the room, accept join requests, and start the game when ready. Rooms can accommodate up to 4 players including bots."
        },
        {
            title: "Add and Change Bots",
            img: "/src/assets/Room_page2.png",
            text: "The gamemaster can add AI bots to fill empty slots and choose their difficulty level: Easy, Medium, or Hard.  Hard bots playing optimally while Easy bots make intentionally suboptimal moves."
        },
        {
            title: "Join Requests",
            img: "/src/assets/Rome_page3.png",
            text: "As a gamemaster, you'll receive notifications when players request to join your room. Review their optional messages and decide whether to accept or decline each request. "
        },
        {
            title: "Game Page",
            img: "/src/assets/Game_page1.png",
            text: "The game board displays all players' positions, the center pile of played cards, and the deck. Your hand appears at the bottom with draggable cards you can reorder. Valid playable cards are highlighted based on the current top card's suit or rank. Draw cards from the deck or play your cards when it's your turn."
        },
        {
            title: "Over Card",
            img: "/src/assets/Game_page2.png",
            text: "The Over card is a wild card that can be played on any card. When you play an Over card, you must choose which suit to change to by selecting one of the four suit buttons. The next player must then play a card of the chosen suit or another special card."
        },
        {
            title: "Suit Change",
            img: "/src/assets/Game_page4.png",
            text: "After playing an Over card, select your desired suit from the four options: Hearts, Acorns, Bells, or Leaves. The chosen suit becomes the active suit for the next player. Strategic suit changes can help you get rid of cards or block opponents."
        },
        {
            title: "Ace Card",
            img: "/src/assets/Game_page3.png",
            text: "Playing an Ace card skips the next player's turn. If you play multiple Aces at once, you skip that many players in sequence. In a 4-player game, playing 3 Aces can bring your turn back around immediately, creating powerful strategic opportunities."
        },
        {
            title: "VII Card",
            img: "/src/assets/Game_page6.png",
            text: "When you play a Seven (VII), the next player must draw 3 cards from the deck. Multiple Sevens can be stacked - each Seven adds 3 more cards to the draw penalty. The affected player will see a draw stack indicator showing how many cards they must draw."
        },
        {
            title: "Counter Drawing Penalty",
            img: "/src/assets/Game_page7.png",
            text: "If you have a Seven or the Faro (Jack of Leaves) when faced with a draw penalty, you can play it to counter and pass the penalty to the next player. The Faro can counter any Seven and can be played on top of any card, making it extremely valuable defensively."
        },
        {
            title: "Streak!",
            img: "/src/assets/Game_page8.png",
            text: "Playing four cards of the same rank in a single turn creates a Streak. When you streak, you get to play again immediately after. This powerful move can help you empty your hand quickly or maintain control of the game flow."
        },
        {
            title: "New Round",
            img: "/src/assets/Game_page9.png",
            text: "When a round ends with one player having cards remaining, they receive a loss mark. The game continues with a new round where players start with one fewer card for each loss mark they have (minimum 0). After 5 losses, a player is eliminated. The last player remaining wins the game."
        },
    ];

    return (
        <div className={styles.tutorialMainContainer}>

            <div className={styles.changeableContentContainer}>
                <button className={styles.navigation} onClick={toLeft}></button>
                <button className={styles.navigation} onClick={toRight}></button>
                <button className={styles.back} onClick={()=>navigate("/")} >❮❮</button>


                <div
                    className={styles.sliderWrapper}
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {slides.map((slide, index) => (
                        <div key={index} className={styles.changeableContent}>
                            <div className={styles.imageContainer}>
                                <img src={slide.img} alt={`Slide ${index + 1}`} />
                            </div>
                            <div className={styles.textContainer}>
                                <div className={styles.text}>
                                    <h2>{slide.title}</h2>
                                    <p>{slide.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.indicators}>
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            className={`${styles.indicator} ${currentIndex === index ? styles.active : ''}`}
                            onClick={() => setCurrentIndex(index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default About