package org.game.pharaohcardgame.Config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Configuration
public class CaffeineConfiguration {
	@Bean
	public CacheManager cacheManager() {
		// Külön Caffeine cache-ek külön TTL-lel:
		Caffeine<Object, Object> userStatusBuilder = Caffeine.newBuilder()
				.expireAfterWrite(5, TimeUnit.MINUTES)
				.maximumSize(5_000);

		Caffeine<Object, Object> gameStateBuilder = Caffeine.newBuilder()
				.expireAfterWrite(30, TimeUnit.MINUTES)
				.maximumSize(50_000);

		Caffeine<Object, Object> defaultBuilder = Caffeine.newBuilder()
				.expireAfterWrite(20, TimeUnit.MINUTES)
				.maximumSize(10_000);

		CaffeineCache userStatusCache = new CaffeineCache("userStatus", userStatusBuilder.build());
		CaffeineCache gameStateCache  = new CaffeineCache("gameState", gameStateBuilder.build());
		CaffeineCache defaultCache    = new CaffeineCache("default", defaultBuilder.build());

		SimpleCacheManager manager = new SimpleCacheManager();
		manager.setCaches(Arrays.asList(userStatusCache, gameStateCache, defaultCache));
		return manager;
	}

}