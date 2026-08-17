package ru.stankin.uits.common.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class MediaResourceConfig implements WebMvcConfigurer {

    private final Path root;
    private final String publicBaseUrl;

    public MediaResourceConfig(@Value("${application.storage.root}") String root,
                               @Value("${application.storage.public-base-url}") String publicBaseUrl) {
        this.root = Path.of(root).toAbsolutePath().normalize();
        this.publicBaseUrl = publicBaseUrl;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = root.toUri().toString();

        if (!location.endsWith("/")) {
            location = location + "/";
        }

        registry.addResourceHandler(publicBaseUrl + "/**")
                .addResourceLocations(location);
    }
}