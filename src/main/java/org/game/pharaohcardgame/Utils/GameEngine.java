package org.game.pharaohcardgame.Utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Exception.PlayerNotFoundException;
import org.game.pharaohcardgame.Model.DTO.EntityMapper;
import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;
import org.game.pharaohcardgame.Utils.SpecialCardLogic.SpecialCardHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Slf4j
@Component
public class GameEngine implements IGameEngine {


    private final GameSessionUtils gameSessionUtils;
    private final EntityMapper entityMapper;
    private final ResponseMapper responseMapper;
    private final CacheManager cacheManager;
    private final List<SpecialCardHandler> specialCardHandlers;


    @Value("${application.game.Init.STARTER_CARD_NUMBER}")
    private int STARTER_CARD_NUMBER;

    @Override
    public NextTurnResult nextTurn(Player currentPlayer, GameSession gameSession, GameState gameState, Integer skipPlayerCount) {


        NextTurnResult nextTurnResult = gameSessionUtils.calculateNextTurn(currentPlayer, gameSession, gameState, skipPlayerCount);

        // Beállítjuk a gameState-ben az új currentPlayerId-t (a következő játékos azonosítóját)
        gameState.setCurrentPlayerId(nextTurnResult.nextPlayer().getPlayerId());

        // Visszaadjuk a NextTurnResult-et, ami tartalmazza a következő Player objektumot és a seat indexet.
        return nextTurnResult;
    }

    @Override
    public boolean isPlayersTurn(Player player, GameState gameState) {
        return player.getPlayerId().equals(gameState.getCurrentPlayerId());
    }


    @Override
    public GameState initGame(Long gameSessionId, List<Player> players) {
        List<Card> deck = gameSessionUtils.createShuffledDeck();
        Map<Long, List<Card>> playerHands = new LinkedHashMap<>();

        return gameSessionUtils.updateGameState(gameSessionId, (current) -> {

            if (current != null) {
                throw new IllegalStateException("Game already initialized for session " + gameSessionId);
            }

            // Üres kezek inicializálása
            players.forEach(player ->
                    playerHands.put(player.getPlayerId(), new ArrayList<>()));
            Player firstPlayer = getFirstPlayer(players);
            GameState gameState = GameState.builder()
                    .gameSessionId(gameSessionId)
                    .deck(deck)
                    .playerHands(playerHands)
                    .playedCards(new ArrayList<>())
                    .status(GameStatus.IN_PROGRESS)
                    .gameData(new HashMap<>())
                    .currentPlayerId(firstPlayer.getPlayerId())
                    .version(0L)
                    .build();

            // Inicializáljuk a lossCount map-et
            Map<Long, Integer> lossCountMap = gameSessionUtils.getSpecificGameDataTypeMap("lossCount", gameState);
            players.forEach(player -> lossCountMap.put(player.getPlayerId(), 0));


            Card firstCard = gameState.getDeck().getFirst();
            gameState.getPlayedCards().add(firstCard);
            gameState.setDeck(new ArrayList<>(gameState.getDeck().subList(1, gameState.getDeck().size())));

            List<Integer> lossCounts = players.stream()
                    .map(player -> lossCountMap.get(player.getPlayerId()))
                    .toList();

            return dealInitialCards(gameState, lossCounts);
        });
    }

    @Override
    public Card drawCard(GameState gameState, Player currentPlayer) {

        List<Card> deck = gameState.getDeck();

        //ha elfogyott a kartya a deckbol akkor itt a logika rá
        deck = handleIfDeckIsEmpty(deck, gameState, currentPlayer);

        if (!deck.isEmpty()) {
            Map<Long, List<Card>> hands = gameState.getPlayerHands();
            List<Card> hand = hands.get(currentPlayer.getPlayerId());
            Card card = deck.getFirst();  // "lehúzzuk a tetejéről"

            card.setOwnerId(currentPlayer.getPlayerId());
            card.setPosition(hand.size());

            hand.add(card);

            //a deckből kiszedjük a felso kartyat
            gameState.setDeck(new ArrayList<>(deck.subList(1, deck.size())));

            List<Card> newHand = gameState.getPlayerHands().get(currentPlayer.getPlayerId());


            int remainingCards = gameState.getDeck().size();
            int playedCardsAvailable = Math.max(0, gameState.getPlayedCards().size() - 1);


            if (remainingCards == 0 && playedCardsAvailable == 0) {
                gameState.getGameData().put("noMoreCardsNextDraw", true);
                log.warn("Next draw will fail - no cards available for game session {}", gameState.getGameSessionId());
            } else {
                // Remove flag if it exists and we have cards
                gameState.getGameData().remove("noMoreCardsNextDraw");
            }

            //ha a kartya huzas után nincs a deckben kartya akkor is újra keverjuka a played cardal
            if (checkNotDrawnCardsNumber(gameState) == 0) {
                reShuffleCards(gameState);
            }

            return newHand.getLast();
        }
        return null;
    }


    @Override
    public List<Card> drawStackOfCards(Player currentPlayer, GameState gameState) {

        Long currentPlayerId = currentPlayer.getPlayerId();

        Map<Long, Integer> drawStack = gameSessionUtils.getSpecificGameDataTypeMap("drawStack", gameState);

        if (!drawStack.containsKey(currentPlayerId)) {
            throw new IllegalStateException("Player don't have to draw stack of cards");
        }

        Integer CardToBeDrawn = drawStack.get(currentPlayerId);

        //ide tároljuk a húzott kártyákat
        List<Card> drawnCards = new ArrayList<>();
        //kihúzunk annyi kártyát amenyit kell
        for (int i = 1; i <= CardToBeDrawn; i++) {
            Card drawnCard = drawCard(gameState, currentPlayer);
            if (drawnCard != null) {
                drawnCards.add(drawnCard);
            } else {
                break;
            }
        }

        if (drawnCards.size() == CardToBeDrawn) {
            drawStack.remove(currentPlayerId);
        } else {
            //egyenlore simán engedjuk továbbb a usert
            drawStack.remove(currentPlayerId);
        }

        int remainingCards = gameState.getDeck().size();
        int playedCardsAvailable = Math.max(0, gameState.getPlayedCards().size() - 1);

        if (remainingCards == 0 && playedCardsAvailable == 0) {
            gameState.getGameData().put("noMoreCardsNextDraw", true);
            log.warn("Next draw will fail after stack draw - no cards available for game session {}", gameState.getGameSessionId());
        } else {
            gameState.getGameData().remove("noMoreCardsNextDraw");
        }

        return drawnCards;
    }
    @Override
    public void suitChangedTo(CardSuit changeSuitTo, GameState gameState) {
        //ez állitolag elég hogy beállítjuk a gamedataban a színváltást
        gameState.getGameData().put("suitChangedTo", changeSuitTo);
    }

    @Override
    public void reShuffleCards(GameState gameState) {
        List<Card> playedCards = gameState.getPlayedCards();

        if (playedCards == null || playedCards.size() <= 1) {
            // Nincs mit újrakeverni (0 vagy 1 kártya van)
            return;
        }

        // Az utolsó kártya (tetején lévő) megmarad a playedCards-ban
        Card topCard = playedCards.getLast();

        // Készítünk egy ÚJ listát a deck-hez (az összes kártya KIVÉVE az utolsó)
        List<Card> cardsToShuffle = new ArrayList<>();
        for (int i = 0; i < playedCards.size() - 1; i++) {
            Card card = playedCards.get(i);
            // Reset card properties
            card.setOwnerId(null);
            card.setPosition(0);
            cardsToShuffle.add(card);
        }

        // Shuffle a new deck
        Collections.shuffle(cardsToShuffle);

        // Beállítjuk a deck-et
        gameState.setDeck(cardsToShuffle);

        // PlayedCards-ot TELJESEN kiürítjük és csak a felső kártyát hagyjuk benne
        playedCards.clear();
        playedCards.add(topCard);

        gameState.getGameData().put("reshuffled", true);

        log.info("Reshuffled {} cards into deck for game session {}",
                cardsToShuffle.size(), gameState.getGameSessionId());
    }


    public int checkNotDrawnCardsNumber(GameState gameState) {
        return gameState.getDeck().size();
    }


    @Override
    public boolean areCardsValid(Player currentPlayer, List<CardRequest> playCardsR, GameState gameState) {

        Map<Long, List<Card>> playerHands = gameState.getPlayerHands();
        //ez azért van hogy ne keruljon bele tobb kartya a pakliba mint amenyinek kéne lennie
        List<Card> otherPlayersCards = playerHands.entrySet().stream()
                .filter(entry -> !entry.getKey().equals(currentPlayer.getPlayerId()))
                .flatMap(entry -> entry.getValue().stream())
                .toList();
        int otherPlayersCardsNumber = otherPlayersCards.size();

        List<Card> currentPlayerCards = playerHands.get(currentPlayer.getPlayerId());
        int currentPlayerCardNumber = currentPlayerCards.size();
        int playedCardsNumber = gameState.getPlayedCards().size();
        int deckNumber = gameState.getDeck().size();
        //todo: itt van olyan baj hogy a frontendrol ketto ughyan olyan kartyat terszunk fel akkor azt nem irj ahibanak mert itt csak a currentPlayerCardNumbert fgigyeli.
        if (otherPlayersCardsNumber + currentPlayerCardNumber + playedCardsNumber + deckNumber > 32) {
            return false;
        }
        //ez azért van hogy a playernek tényleg vannak-e ilyen kártyái
        Set<Card> currentPlayerCardsSet = new HashSet<>(currentPlayerCards);
        List<Card> playCards = entityMapper.toCardFromCardRequestList(playCardsR);

        Set<String> currentIds = currentPlayerCardsSet.stream()
                .map(Card::getCardId)
                .collect(Collectors.toSet());

        Set<String> playedIds = playCards.stream()
                .map(Card::getCardId)
                .collect(Collectors.toSet());

        if (!currentIds.containsAll(playedIds)) {
            return false;
        }


        //ez azért van hogy a playedcard, deck, és más playernek a kezébe nincsbenne azok a kartyak amiket leakar rakni a user

        // A már kijátszott lapok
        List<Card> playedCards = gameState.getPlayedCards();

        // A húzópakli lapjai
        List<Card> deckCards = gameState.getDeck();

        Set<Card> forbiddenCards = new HashSet<>();
        forbiddenCards.addAll(otherPlayersCards);
        forbiddenCards.addAll(playedCards);
        forbiddenCards.addAll(deckCards);

        for (Card card : playCards) {
            if (forbiddenCards.contains(card)) {
                return false; //
            }
        }
        return true;
    }

    @Override
    public void ensureNoDuplicatePlayCards(List<CardRequest> playCards) {
        if (playCards == null || playCards.isEmpty()) {
            return;
        }

        // suit + rank alapján képezzük az egyedi azonosítót
        Map<String, Long> countsByCombo = playCards.stream()
                .map(card -> card.getSuit() + "_" + card.getRank()) // például: "HEARTS_ACE"
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

        // megkeressük a duplikált kombinációkat
        List<String> duplicated = countsByCombo.entrySet().stream()
                .filter(e -> e.getValue() > 1)
                .map(Map.Entry::getKey)
                .toList();

        if (!duplicated.isEmpty()) {
            throw new IllegalArgumentException("Duplicate cards (same suit and rank) in playCards: " + duplicated);
        }
    }

    @Override
    //ez azt ellenorzni hogy lelehete tenni a kártyákat a az adott szimbol és a szamra
    public Boolean checkCardsPlayability(List<CardRequest> playCards, GameState gameState) {
        if (playCards == null || playCards.isEmpty()) return false;


        List<Card> playedCards = gameState.getPlayedCards();
        if (playedCards == null || playedCards.isEmpty()) return false;

        Card lastPlayed = playedCards.getLast();
        CardRequest currentCard = CardRequest.builder()
                .cardId(lastPlayed.getCardId())
                .rank(lastPlayed.getRank())
                .suit(lastPlayed.getSuit())
                .build();

        // Első elem csak olvasva — NEM töröljük az eredeti listából
        CardRequest firstPlayCard = playCards.get(0);

        CardSuit suitChangedTo = gameSessionUtils.getSpecificGameData("suitChangedTo", gameState, null);

        if (!compareSuitsAndRanks(currentCard, firstPlayCard, suitChangedTo, gameState)) return false;
        currentCard = firstPlayCard;

        for (int i = 1; i < playCards.size(); i++) {
            CardRequest playCard = playCards.get(i);
            if (!compareRanks(currentCard, playCard)) return false;
            currentCard = playCard;
        }
        return true;
    }


    @Override
    //leteszi a kartyakat
    //todo: van baj akkor ha a fareoval blokkolni akarjuk a hetes huztast és még streakelni is akarunk akkor kapok olyat hugy Unexpected handler method invocation error
    //todo: VAN OLYAN BAJ HOGY HA MAR KOVETKEZO KOR JON ES  HUZATNI AKKAROK A BOTTAL KARTYAT AKKOR A BOT NEM HUZZA FEL ES UJRA ÉN KOVETKEZEM. ES CSAK AKKOR HUZZA FEL HA MAR CSINALTAM UJRA VALKAMIT. VALAMIERT TELJESEN KISKIPPELEM A BOTOKAT. EZ CSAK AKKOR JON ELO HA VAGY A CSAK KETTEN VAGYUNKA  ABOTTAL VAGY(?) HOGY FRISSEN KEZDOTOTT UJRA A KOR ES MEGKAKAROM HUZATNI
    public void playCards(List<CardRequest> playCards, Player currentPlayer, GameState gameState, GameSession gameSession) {


        if (playCards == null || playCards.isEmpty()) {
            throw new IllegalStateException("Play Card is null");
        }
        ;

        List<Card> incoming = entityMapper.toCardFromCardRequestList(playCards);

        //elveszi a playertol a kartyakat
        List<Card> hand = gameState.getPlayerHands().get(currentPlayer.getPlayerId());
        // Gyűjtsük össze az eltávolítandó cardId-kat
        Set<String> incomingCardIds = incoming.stream()
                .map(Card::getCardId)
                .collect(Collectors.toSet());

        // Távolítsuk el a kártyákat cardId alapján
        hand.removeIf(card -> incomingCardIds.contains(card.getCardId()));

        //a positionokat ujra vissza alakitja 1,2,3-ra, nem marad meg pl a postion igy : 2,3,5
        for (int i = 0; i < hand.size(); i++) {
            Card c = hand.get(i);
            c.setPosition(i + 1);
        }

        //a kartyakat mar nem koti a playerhez
        for (Card card : incoming) {
            card.setOwnerId(null);
            card.setPosition(0);
        }
        //ha speciális a kártyák akkor elinditjuk a specialiskartya logikat
        for (SpecialCardHandler handler : specialCardHandlers) {
            if (handler.applies(incoming)) {
                handler.onPlay(incoming, currentPlayer, gameSession, gameState);
            }
        }

        //leteszi a kartyat
        gameState.getPlayedCards().addAll(incoming);


        if (hand.isEmpty()) {
            handlePlayerEmptyhand(gameState, currentPlayer, gameSession);
        }
        //ha a player éget akkor ezt mentjuk el. csak akkor égethet ha nem heteseket tesz le VAGY  ace-t
        if (    playCards.size() == 4 &&
                !playCards.getFirst().getRank().equals(CardRank.VII) &&
                !playCards.getFirst().getRank().equals(CardRank.ACE)) {
            gameState.getGameData().put("streakPlayerId", currentPlayer.getPlayerId());
            log.info("Player {} streaked! They will play again.", currentPlayer.getPlayerId());
        }
        //ha volt changetto akkor az most már nem kell mert már a player letette a kartyait
        CardSuit suitChangedTo = gameSessionUtils.getSpecificGameData("suitChangedTo", gameState, null);
        if (suitChangedTo != null) gameState.getGameData().remove("suitChangedTo");
        gameState.getGameData().remove("noMoreCardsNextDraw");
        return;
    }


    @Override
    //ha ures a keze akkor már nem kell lépnie és az adot kort nyerte,de még a jatek folytatódik
    public void handlePlayerEmptyhand(GameState gameState, Player player, GameSession gameSession) {
        // Játékos kiszáll az adott körből - már nem játszik tovább ebben a körben
        Set<Long> finishedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("finishedPlayers", gameState);


        finishedPlayers.add(player.getPlayerId());

        log.info("Player {} finished the round (empty hand)", player.getPlayerId());

        // Ellenőrizzük, hány játékos van még játékban
        List<Player> activePlayers = getActivePlayers(gameState, gameSession);

        if (activePlayers.size() == 1) {
            // Csak egy játékos maradt - ő a vesztes
            Player lastPlayer = activePlayers.get(0);
            handleRoundEnd(gameState, lastPlayer);
            if (!isGameEnded(gameState, gameSession)) {

                Map<String, Object> gameData = gameState.getGameData();

                int currentRound = (int) gameData.getOrDefault("currentRound", 0);
                @SuppressWarnings("unchecked")
                Map<Integer, Boolean> isRoundFinished =
                        (Map<Integer, Boolean>) gameData.get("isRoundFinished");

                if (isRoundFinished == null) {
                    isRoundFinished = new HashMap<>();
                }
                isRoundFinished.put(currentRound, true);

                gameData.put("isRoundFinished", isRoundFinished);

                // Új kör indítása
                startNewRound(gameState, gameSession);
            } else {
                gameFinished(gameState);
            }
        }
    }

    public boolean isGameEnded(GameState gameState, GameSession gameSession) {
        // Az összes játékos a sessionből
        List<Player> allPlayers = gameSession.getPlayers();
        if (allPlayers == null || allPlayers.isEmpty()) {
            return true;
        }

        // A lossCount map lekérése a gameState-ből
        Map<Long, Integer> lossCountMap = gameSessionUtils.getSpecificGameDataTypeMap("lossCount", gameState);

        // Számoljuk, hány játékosnak VAN még <5 lossCount-ja
        long stillActiveCount = allPlayers.stream()
                .filter(p -> {
                    Integer lossCount = lossCountMap.getOrDefault(p.getPlayerId(), 0);
                    return lossCount < STARTER_CARD_NUMBER;
                })
                .count();

        // Ha 1 vagy kevesebb aktív játékos maradt, akkor vége a játéknak
        return stillActiveCount <= 1;
    }

    public List<Player> getActivePlayers(GameState gameState, GameSession gameSession) {
        Set<Long> finishedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("finishedPlayers", gameState);
        Set<Long> lostPlayers = gameSessionUtils.getSpecificGameDataTypeSet("lostPlayers", gameState);

        return gameSession.getPlayers().stream()
                .filter(p -> !finishedPlayers.contains(p.getPlayerId()) &&
                        !lostPlayers.contains(p.getPlayerId()))
                .toList();
    }

    //todo: amikor a mar egy bot kiesett a jatekbol es azoota lejatszottunk megegy kort akkor valamiért a régen kiesett player kapta a losscount novelest
    private void handleRoundEnd(GameState gameState, Player lastPlayer) {
        // Az utolsó játékos veszít - növeljük a loss count-ját a gameData-ban
        Map<Long, Integer> lossCountMap = gameSessionUtils.getSpecificGameDataTypeMap("lossCount", gameState);
        Integer currentLossCount = lossCountMap.getOrDefault(lastPlayer.getPlayerId(), 0);
        lossCountMap.put(lastPlayer.getPlayerId(), currentLossCount + 1);

        log.info("Round ended. Player {} lost (loss count: {})",
                lastPlayer.getPlayerId(), currentLossCount + 1);

        // Tisztítsuk meg a finished players setet a következő körre
        gameState.getGameData().remove("finishedPlayers");

        gameState.getGameData().put("roundEnded", true);

    }

    @Override

    public void startNewRound(GameState gameState, GameSession gameSession) {
        // Készítsük el az új, tiszta deck-et
        List<Card> newDeck = new ArrayList<>();

        // Ha van jelenlegi deck, másoljuk át
        if (gameState.getDeck() != null && !gameState.getDeck().isEmpty()) {
            newDeck.addAll(new ArrayList<>(gameState.getDeck()));
        }

        //Mozgassuk vissza a playedCards összes lapját
        List<Card> played = gameState.getPlayedCards() == null
                ? Collections.emptyList()
                : new ArrayList<>(gameState.getPlayedCards());
        for (Card c : played) {
            c.setOwnerId(null);
            c.setPosition(0);
        }
        newDeck.addAll(played);
        // tisztítsuk a playedCards-ot
        if (gameState.getPlayedCards() != null) {
            gameState.getPlayedCards().clear();
        }

        // 4) Gyűjtsük össze az összes játékos kezében lévő kártyát és reseteljük mezőiket
        List<Card> handCards = gameState.getPlayerHands().values().stream()
                .flatMap(List::stream)
                .peek(c -> {
                    c.setOwnerId(null);
                    c.setPosition(0);
                })
                .toList();

        newDeck.addAll(handCards);

        //  Töröljük a playerHands map-et
        gameState.getPlayerHands().clear();

        List<Player> players = gameSession.getPlayers();
        //initializaljuk a player handset
        if (players == null) {
            throw new PlayerNotFoundException("not found any player in this gameSession");
        }
        for (Player p : players) {
            gameState.getPlayerHands().put(p.getPlayerId(), new ArrayList<>());
        }


        //Shuffle
        Collections.shuffle(newDeck);

        // Beállítjuk az új deck-et a gameState-re
        gameState.setDeck(newDeck);

        //letesszuk az elso played cardot.
        Card firstCard = gameState.getDeck().getFirst();
        gameState.getPlayedCards().add(firstCard);
        gameState.setDeck(new ArrayList<>(gameState.getDeck().subList(1, gameState.getDeck().size())));

        // LossCount lekérése a gameData-ból
        Map<Long, Integer> lossCountMap = gameSessionUtils.getSpecificGameDataTypeMap("lossCount", gameState);
        List<Integer> lossCounts = players.stream()
                .map(p -> lossCountMap.getOrDefault(p.getPlayerId(), 0))
                .toList();

        //lecheckeljuk hogy ki vesztett már es beleteszzuk a gamedataba
        Set<Long> lostPlayers = gameSessionUtils.getSpecificGameDataTypeSet("lostPlayers", gameState);


        Set<Long> newLost = players.stream()
                .filter(p -> lossCountMap.getOrDefault(p.getPlayerId(), 0) == STARTER_CARD_NUMBER)
                .map(Player::getPlayerId)
                .collect(Collectors.toSet());

        lostPlayers.clear();
        lostPlayers.addAll(newLost);


        dealInitialCards(gameState, lossCounts);

        // RESET ROUND-SPECIFIC GAME DATA
        // Töröljük az előző kör speciális játék állapotait
        gameState.getGameData().remove("streakPlayerId");      // Égés állapot törlése
        gameState.getGameData().remove("suitChangedTo");       // OVER kártya színváltás törlése
        gameState.getGameData().remove("skippedPlayers");      // ACE kártya skip állapot törlése
        gameState.getGameData().remove("drawStack");           // 7-es kártya húzási kötelezettség törlése
        gameState.getGameData().remove("finishedPlayers");

        Map<String, Object> gameData = gameState.getGameData();
        int currentRound = (int) gameData.getOrDefault("currentRound", 0);
        currentRound++;
        gameData.put("currentRound", currentRound);

        @SuppressWarnings("unchecked")
        Map<Integer, Boolean> isRoundFinished =
                (Map<Integer, Boolean>) gameData.get("isRoundFinished");

        if (isRoundFinished == null) {
            isRoundFinished = new HashMap<>();
        }

        // új kör még nem ért véget
        isRoundFinished.put(currentRound, false);

        gameData.put("isRoundFinished", isRoundFinished);
    }

    @Override
    public void gameFinished(GameState gameState) {
        gameState.setStatus(GameStatus.FINISHED);

    }

    public NextTurnResult determineWhoWillStartTheRound(GameSession gameSession, GameState gameState) {
        // Az utolsó vesztes kezd (aki bekerült a lossCount map-be legutoljára)
        Map<Long, Integer> lossCountMap = gameSessionUtils.getSpecificGameDataTypeMap("lossCount", gameState);
        Set<Long> lostPlayers = gameSessionUtils.getSpecificGameDataTypeSet("lostPlayers", gameState);

        Player nextPlayer = gameSession.getPlayers().stream()
                .filter(p -> !lostPlayers.contains(p.getPlayerId())) // Nem vesztett ki végleg
                .max(Comparator.comparing(p -> lossCountMap.getOrDefault(p.getPlayerId(), 0))) // Legnagyobb lossCount
                .orElseThrow(() -> new IllegalStateException("Can't find active player"));

        return new NextTurnResult(nextPlayer, nextPlayer.getSeat());
    }


    //leelenorizzuk hogy a playernek kell e huznia kartyat
    public boolean playerHaveToDrawStack(Player player, GameState gameState) {
        Long playerId = player.getPlayerId();
        Map<Long, Integer> drawStack = gameSessionUtils.getSpecificGameDataTypeMap("drawStack", gameState);
        return drawStack.containsKey(playerId);
    }


    private Player getFirstPlayer(List<Player> players) {
        return players.stream()
                .min(Comparator.comparing(Player::getSeat))
                .orElseThrow(() -> new IllegalStateException("No players found"));
    }

    private boolean compareRanks(CardRequest firstCard, CardRequest secondCard) {
        return firstCard.getRank().equals(secondCard.getRank());
    }


    private Boolean compareSuitsAndRanks(CardRequest firstCard, CardRequest secondCard, CardSuit suitChangedTo, GameState gameState) {


        //ha szín váltós kártyát tesz le akkor akármire leteheti
        if (secondCard.getRank() == CardRank.OVER) {
            return true;
        }
        ;
        //a fáreóra lelehet tenni mindent
        if (firstCard.getRank() == CardRank.JACK && firstCard.getSuit() == CardSuit.LEAVES) return true;

        //a feraot az osszes hetesre lelehet tenni
        if ((secondCard.getRank() == CardRank.JACK && secondCard.getSuit() == CardSuit.LEAVES) && firstCard.getRank().equals(CardRank.VII))
            return true;

        //ha a suit meg lett változatva akkor  azt vegyük figyelembe
        if (suitChangedTo != null) {
            if (secondCard.getSuit() == suitChangedTo) {
                return true;
            } else {
                return false;
            }
        }

        return firstCard.getRank().equals(secondCard.getRank()) || firstCard.getSuit().equals(secondCard.getSuit());
    }

    private GameState dealInitialCards(GameState state, List<Integer> lossCount) {

        List<Card> deck = state.getDeck();                 // marad List, indexszel lépünk
        Map<Long, List<Card>> hands = state.getPlayerHands();

        // Fontos: a játékosok sorrendje legyen stabil! (pl. LinkedHashMap)
        List<Long> playerIds = new ArrayList<>(hands.keySet());

        if (playerIds.size() != lossCount.size()) {
            throw new IllegalArgumentException("players és lossCount méret eltér");
        }

        // Minden játékosnak ennyi lap kell: 5 - lossCount (min. 0)
        int n = playerIds.size();
        int[] need = new int[n];
        int remainingToDeal = 0;
        for (int i = 0; i < n; i++) {
            need[i] = Math.max(0, STARTER_CARD_NUMBER - lossCount.get(i));
            remainingToDeal += need[i];
        }

        int deckIdx = 0;     // nincs remove(0) → O(1) előrelépés
        int i = 0;           // körbejáró index

        while (remainingToDeal > 0 && deckIdx < deck.size()) {
            if (need[i] > 0) {
                Long pid = playerIds.get(i);
                List<Card> hand = hands.get(pid);

                Card card = deck.get(deckIdx++);  // "lehúzzuk a tetejéről"

                card.setOwnerId(pid);
                card.setPosition(hand.size());

                hand.add(card);
                need[i]--;
                remainingToDeal--;
            }
            i = (i + 1) % n; // következő játékos (körbe)
        }

        state.setDeck(new ArrayList<>(deck.subList(deckIdx, deck.size())));

        return state;
    }


    public boolean isPlayerFinished(Player currentPlayer, GameState gameState) {
        Set<Long> finishedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("finishedPlayers", gameState);
        return finishedPlayers.contains(currentPlayer.getPlayerId());
    }

    public boolean isPlayerLost(Player currentPlayer, GameState gameState) {
        Set<Long> finishedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("lostPlayers", gameState);
        return finishedPlayers.contains(currentPlayer.getPlayerId());
    }

    private List<Card> handleIfDeckIsEmpty(List<Card> deck, GameState gameState, Player currentPlayer) {
        //todo: ha már tud letenni a bot kartyat akkor kell nekunk olyan  hogy ide teszunk egy custom exceptiont és majd a bot azt elcatcheli  akkor majd ha akarna huzni, de nem tud akkor helyette muszaj letennie valamelyik kartyajat. De ha nem tud letenni egy kartyat sem akkor ne csinajon semmit ebben a körben. Ez azert kell mert ha mar nincs tobb kartya a deckben akkor ne áljon meg a jaték a bot nál
        if (deck.isEmpty()) {
            if (gameState.getPlayedCards().size() == 1) {
                //ez azért kell mert ha volt akinek kellett huznia kartyat akkor most nem kell
                log.info("No more cards in deck gamesession id: {}", gameState.getGameSessionId());

                //ez azÉrt kelll mert ha az egyik user felhuzta az utolso kartyat es a played cardban is csak 1 kartya volt, ilyenkor nem kerul a deckbe kartya a következo player mar nem tudott felhuzni kartyat mert ures volt a deck. Ezért muszály neki letenni kartyat.Majd a következo player akarna kartyat huzni de az nem volt megshufflezva és nem kerult bele a frissen letett kartya a deckbe ezért empty maradt a deck. de most ez beleteszi azt a egy frissen letett kartyat a deckbe
            } else {
                //todo: ha reshuflezzuk a kartyakat akkor arrol a afrontendnek kuldeni kell infot és elkell kuldeni a decksizet is

                reShuffleCards(gameState);

                deck = gameState.getDeck();
            }
        }
        return deck;
    }


}
