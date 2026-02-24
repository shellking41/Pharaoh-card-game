package org.game.pharaohcardgame.Service.Implementation;


import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Model.*;

import org.game.pharaohcardgame.Model.DTO.Response.RoomStatisticsResponse;

import org.game.pharaohcardgame.Model.DTO.Response.UserStatisticsResponse;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Repository.GameStatisticsRepository;
import org.game.pharaohcardgame.Repository.RoomStatisticsRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Repository.UserStatisticsRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatisticsService {

	private final GameStatisticsRepository gameStatisticsRepository;
	private final UserStatisticsRepository userStatisticsRepository;
	private final RoomStatisticsRepository roomStatisticsRepository;
	private final ResponseMapper responseMapper;
	private final UserRepository userRepository;

	/**
	 * Rögzíti egy játékos eredményét a játék végén
	 * NEM bot játékosoknak
	 */
	@Transactional
	public void recordGameResult(User user, Room room, GameSession gameSession,
	                             boolean isWinner, int finalPosition) {

		if (user == null) {
			log.warn("Cannot record game result for null user");
			return;
		}

		// GameStatistics létrehozása
		GameStatistics gameStats = GameStatistics.builder()
				.user(user)
				.room(room)
				.gameSession(gameSession)
				.isWinner(isWinner)
				.finalPosition(finalPosition)
				.playedAt(LocalDateTime.now())
				.countedInStats(false) // Még nem számoltuk bele a statisztikákba
				.build();

		gameStatisticsRepository.save(gameStats);

		log.info("Recorded game result for user {} in room {} - Winner: {}, Position: {}",
				user.getId(), room.getRoomId(), isWinner, finalPosition);
	}

	/**
	 * Frissíti a felhasználó és szoba statisztikákat a játék végeztével
	 * Ez CSAK akkor hívódik meg, ha a játék NORMÁLISAN ért véget (nem gamemaster kilépés)
	 */
	@Transactional
	public void updateStatisticsAfterGameEnd(Long gameSessionId) {

		// Lekérjük az összes nem számolt statisztikát ehhez a játékhoz
		List<GameStatistics> uncountedStats = gameStatisticsRepository
				.findUncountedByGameSessionId(gameSessionId);

		if (uncountedStats.isEmpty()) {
			log.info("No uncounted statistics found for game session {}", gameSessionId);
			return;
		}

		for (GameStatistics gameStat : uncountedStats) {
			User user = gameStat.getUser();
			Room room = gameStat.getRoom();

			// User statistics frissítése
			UserStatistics userStats = userStatisticsRepository.findByUser_Id(user.getId())
					.orElseGet(() -> {
						UserStatistics newStats = UserStatistics.builder()
								.user(user)
								.build();
						return userStatisticsRepository.save(newStats);
					});

			if (gameStat.getIsWinner()) {
				userStats.incrementWins();
			} else {
				userStats.incrementLosses();
			}
			userStatisticsRepository.save(userStats);

			// Room statistics frissítése
			RoomStatistics roomStats = roomStatisticsRepository
					.findByUser_IdAndRoom_RoomId(user.getId(), room.getRoomId())
					.orElseGet(() -> {
						RoomStatistics newStats = RoomStatistics.builder()
								.user(user)
								.room(room)
								.build();
						return roomStatisticsRepository.save(newStats);
					});

			if (gameStat.getIsWinner()) {
				roomStats.incrementWins();
			} else {
				roomStats.incrementLosses();
			}
			roomStatisticsRepository.save(roomStats);

			// Megjelöljük, hogy ez a játék már be lett számítva
			gameStat.setCountedInStats(true);
			gameStatisticsRepository.save(gameStat);

			log.info("Updated statistics for user {} - Total W/L: {}/{}, Room W/L: {}/{}",
					user.getId(),
					userStats.getTotalWins(), userStats.getTotalLosses(),
					roomStats.getWinsInRoom(), roomStats.getLossesInRoom());
		}
	}

	/**
	 * Törli a nem számolt statisztikákat (pl. ha gamemaster kilépett)
	 */
	@Transactional
	public void discardUncountedStatistics(Long gameSessionId) {
		List<GameStatistics> uncountedStats = gameStatisticsRepository
				.findUncountedByGameSessionId(gameSessionId);

		if (!uncountedStats.isEmpty()) {
			gameStatisticsRepository.deleteAll(uncountedStats);
			log.info("Discarded {} uncounted statistics for game session {}",
					uncountedStats.size(), gameSessionId);
		}
	}


	/**
	 * Lekéri egy felhasználó statisztikáit DTO-ként
	 */
	public UserStatisticsResponse getUserStatistics(Long userId) {
		UserStatistics userStats = userStatisticsRepository.findByUser_Id(userId)
				.orElse(null);

		if (userStats == null) {
			User user = userRepository.findById(userId)
					.orElseThrow(()-> new EntityNotFoundException("User not found"));
			// Ha nincs még statisztika, visszaadunk egy default DTO-t
			return UserStatisticsResponse.builder()
					.userId(userId)
					.username(user.getUsername())
					.totalGamesPlayed(0)
					.totalWins(0)
					.totalLosses(0)
					.winRate(0.0)
					.build();
		}

		return responseMapper.toUserStatisticsDTO(userStats);
	}
	@Async
	public CompletableFuture<UserStatisticsResponse> getGlobalBest(){
		List<UserStatistics> allStats = userStatisticsRepository.findAll();

		UserStatistics best = allStats.stream()
				.filter(stat -> stat.getTotalGamesPlayed() > 0)
				.max(Comparator.comparingDouble(stat -> {
					//a log kis szám esetén gyorsan növekszik majd utána szépen lassan
					return stat.getWinRate() * Math.log(stat.getTotalGamesPlayed());
				}))
				.orElseThrow(() -> new EntityNotFoundException("No stats found"));

		return CompletableFuture.completedFuture(responseMapper.toUserStatisticsDTO(best));
	}
	/**
	 * Lekéri egy felhasználó szobánkénti statisztikáit DTO listként
	 */
	public List<RoomStatisticsResponse> getUserRoomStatistics(Long userId) {
		List<RoomStatistics> roomStats = roomStatisticsRepository.findByUser_Id(userId);
		return responseMapper.toRoomStatisticsDTOList(roomStats);
	}

	/**
	 * Lekéri egy szoba leaderboard-ját DTO listként
	 */
	public List<RoomStatisticsResponse> getRoomLeaderboard(Long roomId) {
		List<RoomStatistics> leaderboard = roomStatisticsRepository
				.findByRoom_RoomIdOrderByWinRateInRoomDesc(roomId);
		return responseMapper.toRoomStatisticsDTOList(leaderboard);
	}


}