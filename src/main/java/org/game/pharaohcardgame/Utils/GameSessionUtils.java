package org.game.pharaohcardgame.Utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;
import org.game.pharaohcardgame.Exception.LockAcquisitionException;
import org.game.pharaohcardgame.Exception.LockInterruptedException;
import org.game.pharaohcardgame.Model.DTO.Response.CardInHandResponse;
import org.game.pharaohcardgame.Model.DTO.Response.PlayerHandResponse;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Service.Implementation.CacheService;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Slf4j
@Component
public class GameSessionUtils {
	private static final String GAME_STATE_KEY = "gameState_";
	private static final int GAME_STATE_TTL = 24; // 24 óra TTL

	private final ObjectMapper objectMapper;
	private final CacheService cacheService;
	private final CacheManager cacheManager;
	private final RedissonClient redissonClient;
	private final ResponseMapper responseMapper;

	public GameState getGameState(Long gameSessionId) {
		String key = GAME_STATE_KEY + gameSessionId;
		Cache cache = cacheManager.getCache("gameState");
		GameState gameState = cacheService.getCachedData(cache, key, "gameState", GameState.class);

		if (gameState == null) {
			return null;
		}

		try {
			return gameState;
		} catch (Exception e) {
			throw new RuntimeException("Failed to deserialize game state", e);
		}
	}
	public void deleteGameState(Long gameSessionId) {
		String key = GAME_STATE_KEY + gameSessionId;
		Cache cache = cacheManager.getCache("gameState");
		if (cache != null) {
			cache.evict(key);
		}

		log.info("Deleted game state for session: {}", gameSessionId);
	}

	public PlayerHandResponse getPlayerHand(Long gameSessionId, Long playerId) {
		GameState gameState = getGameState(gameSessionId);
		if(gameState==null){
			throw new EntityNotFoundException("Game state not found for session: " + gameSessionId);
		}

		List<Card> ownCards = gameState.getPlayerHands().get(playerId);
		if (ownCards == null) {
			throw new EntityNotFoundException("Player not found in game");
		}
		// Saját kártyák konvertálása
		List<CardInHandResponse> ownCardInHandRespons =responseMapper.toCardInHandResponseList(ownCards);


		// Más játékosok kártyaszámai
		Map<Long, Integer> otherPlayersCardCount = gameState.getPlayerHands().entrySet()
				.stream()
				.filter(entry -> !entry.getKey().equals(playerId))
				.collect(Collectors.toMap(
						Map.Entry::getKey,
						entry -> entry.getValue().size()
				));

		return PlayerHandResponse.builder()
				.playerId(playerId)
				.ownCards(ownCardInHandRespons)
				.otherPlayersCardCount(otherPlayersCardCount)
				.build();
	}

	public List<Card> createShuffledDeck() {

		List<Card> deck = new ArrayList<>();
		for (CardSuit suit : CardSuit.values()) {
			for (CardRank rank : CardRank.values()) {
				Card card = Card.builder()
						.cardId(UUID.randomUUID().toString())
						.suit(suit)
						.rank(rank)
						.build();
				deck.add(card);
			}
		}

		Collections.shuffle(deck);

		return deck;
	}

	public GameState updateGameState(Long gameSessionId, Function<GameState,GameState> updater){
		String cacheKey = GAME_STATE_KEY + gameSessionId;;
		Cache cache = cacheManager.getCache("gameState");
		RLock lock = redissonClient.getLock(cacheKey);
		try {
			boolean locked = lock.tryLock(10, 30, TimeUnit.SECONDS);
			if (locked) {

				GameState currentGameState=getGameState(gameSessionId);

				GameState updatedGameState=updater.apply(currentGameState);
				if(updatedGameState==null){
					throw new EntityNotFoundException("Game state not found for session: " + gameSessionId);
				}
				cacheService.saveInCache(cache, cacheKey, updatedGameState, "gameState");
				return updatedGameState;
			}else {

				throw new LockAcquisitionException("Failed to acquire lock");
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new LockInterruptedException("Thread interrupted while acquiring lock", e);
		}finally {
			if (lock.isHeldByCurrentThread()) {
				lock.unlock();
			}
		}

	}
}
