package ru.stankin.uits.common;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RequestIdFilterTest {

    @Test
    void clearsRequestIdWhenDownstreamThrows() {
        RequestIdFilter filter = new RequestIdFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/public/news");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThatThrownBy(() -> filter.doFilter(request, response, (req, res) -> {
            assertThat(MDC.get("requestId")).isNotBlank().isEqualTo(response.getHeader(RequestIdFilter.HEADER_NAME));
            throw new ServletException("downstream failure");
        })).isInstanceOf(ServletException.class);

        assertThat(MDC.get("requestId")).isNull();
    }
}
