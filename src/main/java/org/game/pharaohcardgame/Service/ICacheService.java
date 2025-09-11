package org.game.pharaohcardgame.Service;

public interface ICacheService {


	<T> void saveInCache(org.springframework.cache.Cache cache, String cacheKey, T data, String logPrefix);

	<T> T getCachedData(org.springframework.cache.Cache cache, String cacheKey, String logPrefix, Class<T> type);
}
