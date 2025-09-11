package org.game.pharaohcardgame.Config;


import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.task.DelegatingSecurityContextAsyncTaskExecutor;

import java.util.concurrent.Executor;


@Configuration
public class AsyncConfig implements AsyncConfigurer {



	@Override
	public Executor getAsyncExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(4);
		executor.setQueueCapacity(150);
		executor.setMaxPoolSize(4);
		executor.setThreadNamePrefix("AsyncThread-");
		executor.initialize();

		return new DelegatingSecurityContextAsyncTaskExecutor(executor);
	}

}
