package ru.stankin.uits.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverters;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.deser.jdk.StringDeserializer;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.module.SimpleModule;

@Configuration
@RequiredArgsConstructor
public class JacksonConfig implements WebMvcConfigurer {

    private final JsonMapper jsonMapper;

    @Override
    public void configureMessageConverters(HttpMessageConverters.ServerBuilder builder) {
        JsonMapper requestMapper = jsonMapper.rebuild()
                .addModule(new SimpleModule("blank-string-to-null")
                        .addDeserializer(String.class, new BlankStringToNullDeserializer()))
                .build();

        builder.withJsonConverter(new JacksonJsonHttpMessageConverter(requestMapper));
    }

    static class BlankStringToNullDeserializer extends StringDeserializer {

        @Override
        public String deserialize(JsonParser parser, DeserializationContext context) {
            String value = super.deserialize(parser, context);

            return value.isBlank() ? null : value;
        }
    }
}
