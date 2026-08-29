package ru.stankin.uits.module.schedule.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class ScheduleServiceClientConfig {

    @Bean
    public RestClient scheduleServiceRestClient(
            RestClient.Builder builder,
            @Value("${application.schedule-service.url}") String url,
            @Value("${application.schedule-service.connect-timeout}") Duration connectTimeout,
            @Value("${application.schedule-service.read-timeout}") Duration readTimeout) {
        HttpClientSettings settings = HttpClientSettings.defaults()
                .withTimeouts(connectTimeout, readTimeout);
        return builder
                .baseUrl(url)
                .requestFactory(ClientHttpRequestFactoryBuilder.detect().build(settings))
                .build();
    }
}
