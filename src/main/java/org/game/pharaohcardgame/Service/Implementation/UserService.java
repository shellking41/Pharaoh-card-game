package org.game.pharaohcardgame.Service.Implementation;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Exception.LockAcquisitionException;
import org.game.pharaohcardgame.Exception.LockInterruptedException;
import org.game.pharaohcardgame.Model.DTO.Request.UserInfoRequest;
import org.game.pharaohcardgame.Model.DTO.Response.UserCurrentStatus;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Service.IAuthenticationService;
import org.game.pharaohcardgame.Service.ICacheService;
import org.game.pharaohcardgame.Service.IUserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.redisson.api.RedissonClient;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.redisson.api.RLock;


import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements IUserService {

	private final IAuthenticationService authenticationService;
	private final JwtService jwtService;
	private final TokensRepository tokensRepository;
	private final UserRepository userRepository;
	private final ResponseMapper responseMapper;
	private final CacheManager cacheManager;
	private final ICacheService cacheService;
	private final RedissonClient redissonClient;

	@Override
	@Transactional
	@Async

	public CompletableFuture<UserCurrentStatus> userStatus(UserInfoRequest userInfoRequest) {
		String LOG_PREFIX = "userStatus";


		try {
			String token = userInfoRequest.getToken();
			if (token == null || token.isBlank()) {
				log.warn("No token provided");
				return CompletableFuture.completedFuture(responseMapper.toUserCurrentStatus(null, false));
			}

			boolean isTokenValid = tokensRepository.findByToken(token)
					.map(t -> !t.isExpired() && !t.isRevoked())
					.orElse(false);

			if (!isTokenValid) {
				log.warn("Invalid or revoked token: {}", token);
				return CompletableFuture.completedFuture(responseMapper.toUserCurrentStatus(null, false));
			}

			Long userId = jwtService.getUserIdFromToken(token);
			if (userId == null) {
				log.warn("User id could not be extracted from token");
				return CompletableFuture.completedFuture(responseMapper.toUserCurrentStatus(null, false));
			}



			String cacheKey = String.format("userStatus_%d", userId);
			Cache cache = cacheManager.getCache("userStatus");

			UserCurrentStatus userCurrentStatus = cacheService.getCachedData(cache, cacheKey, LOG_PREFIX, UserCurrentStatus.class);
			if (userCurrentStatus != null) {
				return CompletableFuture.completedFuture(userCurrentStatus);
			}
			RLock lock = redissonClient.getLock(cacheKey);
			try {
				boolean locked = lock.tryLock(10, 30, TimeUnit.SECONDS);
				if (locked) {
					userCurrentStatus = cacheService.getCachedData(cache, cacheKey, LOG_PREFIX, UserCurrentStatus.class);
					if (userCurrentStatus != null) {
						return CompletableFuture.completedFuture(userCurrentStatus);
					}

					User user = userRepository.findByIdWithRooms(userId)
							.orElseThrow(() -> new EntityNotFoundException("user not found"));

					userCurrentStatus = responseMapper.toUserCurrentStatus(user, true);

					cacheService.saveInCache(cache, cacheKey, userCurrentStatus, LOG_PREFIX);

					return CompletableFuture.completedFuture(userCurrentStatus);


				} else {

					throw new LockAcquisitionException("Failed to acquire lock");
				}
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				throw new LockInterruptedException("Thread interrupted while acquiring lock", e);
			} finally {
				if (lock.isHeldByCurrentThread()) {
					lock.unlock();
				}
			}



		} catch (Exception e) {
			log.error("Unexpected error while reading user status", e);
			return CompletableFuture.completedFuture(responseMapper.toUserCurrentStatus(null, false));
		}
	}
}

