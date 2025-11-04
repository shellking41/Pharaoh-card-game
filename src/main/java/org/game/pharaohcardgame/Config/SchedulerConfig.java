package org.game.pharaohcardgame.Config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@Slf4j
public class SchedulerConfig {
    @Bean
    public ThreadPoolTaskExecutor botTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Core threads: mindig ennyi thread él
        executor.setCorePoolSize(20);

        // Max threads: maximum ennyi thread lehet
        executor.setMaxPoolSize(100);

        // Queue capacity: ennyi task várhat
        executor.setQueueCapacity(200);

        executor.setThreadNamePrefix("bot-exec-");

        // Rejection policy amikor megtelt
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());

        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);

        executor.initialize();

        log.info("🤖 Bot executor: core={}, max={}, queue={}",
                20, 100, 200);

        return executor;
    }
}