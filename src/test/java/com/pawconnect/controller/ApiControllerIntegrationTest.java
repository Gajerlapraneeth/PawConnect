package com.pawconnect.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawconnect.model.AppUser;
import com.pawconnect.repository.AnimalReportRepository;
import com.pawconnect.repository.AppUserRepository;
import com.pawconnect.repository.FeedingSpotRepository;
import com.pawconnect.repository.FeedingTaskRepository;
import com.pawconnect.repository.TaskParticipantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "ADMIN_EMAIL=admin@example.com",
        "spring.datasource.url=jdbc:h2:mem:pawconnect-test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class ApiControllerIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AppUserRepository users;
    @Autowired private FeedingSpotRepository spots;
    @Autowired private FeedingTaskRepository tasks;
    @Autowired private TaskParticipantRepository participants;
    @Autowired private AnimalReportRepository reports;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void clearDatabase() {
        participants.deleteAll();
        tasks.deleteAll();
        reports.deleteAll();
        spots.deleteAll();
        users.deleteAll();
    }

    @Test
    void writeEndpointsRejectAnonymousRequests() throws Exception {
        mockMvc.perform(post("/api/spots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test spot\",\"location\":\"Test area\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").exists());
    }

        @Test
        void anonymousSessionCheckReturnsAnEmptySuccessfulResponse() throws Exception {
                mockMvc.perform(get("/api/auth/me"))
                                .andExpect(status().isOk())
                                .andExpect(content().string(""));
        }

    @Test
    void registrationHashesPasswordAndCreatesAnAdminSessionForConfiguredEmail() throws Exception {
        String password = "a-long-test-password";
        MvcResult result = register("admin@example.com", password)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        AppUser user = users.findByEmailIgnoreCase("admin@example.com").orElseThrow();
        assertTrue(passwordEncoder.matches(password, user.getPassword()));
        assertNotNull(result.getRequest().getSession(false));
    }

    @Test
    void volunteerCannotChangeReportStatusButAdministratorCan() throws Exception {
        String volunteerEmail = "volunteer-" + UUID.randomUUID() + "@example.com";
        MvcResult volunteerResult = register(volunteerEmail, "a-long-test-password")
                .andExpect(status().isOk()).andReturn();
        MockHttpSession volunteerSession = (MockHttpSession) volunteerResult.getRequest().getSession(false);

        String reportJson = "{\"animalType\":\"Dog\",\"location\":\"Test park\",\"description\":\"Needs a check-up\"}";
        MvcResult reportResult = mockMvc.perform(post("/api/reports")
                        .session(volunteerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportJson))
                .andExpect(status().isOk()).andReturn();
        long reportId = objectMapper.readTree(reportResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/reports/{id}/status", reportId)
                        .session(volunteerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "RESOLVED"))))
                .andExpect(status().isForbidden());

        MvcResult adminResult = register("admin@example.com", "a-long-test-password")
                .andExpect(status().isOk()).andReturn();
        MockHttpSession adminSession = (MockHttpSession) adminResult.getRequest().getSession(false);
        mockMvc.perform(patch("/api/reports/{id}/status", reportId)
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "RESOLVED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }

    private org.springframework.test.web.servlet.ResultActions register(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "name", "Project Tester",
                        "email", email,
                        "password", password,
                        "phone", ""
                ))));
    }
}