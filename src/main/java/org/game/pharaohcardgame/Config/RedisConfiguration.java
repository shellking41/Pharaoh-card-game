package org.game.pharaohcardgame.Config;

import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class RedisConfiguration {

	@Bean
	public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
		// Serializerek
		StringRedisSerializer keySerializer = new StringRedisSerializer();
		GenericJackson2JsonRedisSerializer valueSerializer = new GenericJackson2JsonRedisSerializer();

		RedisSerializationContext.SerializationPair<String> keyPair =
				RedisSerializationContext.SerializationPair.fromSerializer(keySerializer);

		RedisSerializationContext.SerializationPair<Object> valuePair =
				RedisSerializationContext.SerializationPair.fromSerializer(valueSerializer);

		// Default konfiguráció
		RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
				.serializeKeysWith(keyPair)                  // kulcsok Stringként
				.serializeValuesWith(valuePair)              // értékek JSON-ként
				.entryTtl(Duration.ofMinutes(20))            // alap TTL
				.disableCachingNullValues();

		Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
		cacheConfigurations.put("userStatus", defaultConfig.entryTtl(Duration.ofMinutes(5)));
		cacheConfigurations.put("gameState", defaultConfig.entryTtl(Duration.ofMinutes(30)));

		return RedisCacheManager.builder(redisConnectionFactory)
				.cacheDefaults(defaultConfig)
				.withInitialCacheConfigurations(cacheConfigurations)
				.transactionAware()
				.build();
	}

}