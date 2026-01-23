package com.example.check.service;

import com.example.check.pojo.AiBuilderDeployRequest;
import com.example.check.pojo.AiBuilderPreview;
import com.example.check.pojo.AiBuilderRequest;
import com.example.check.util.AiBuilderGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
public class AiBuilderServiceTests {

    @Autowired
    private AiBuilderService aiBuilderService;

    @MockBean
    private AiBuilderGenerator aiBuilderGenerator;

    @Test
    public void testCreatePreview() {
        // Arrange
        Integer userId = 1001;
        AiBuilderRequest request = new AiBuilderRequest("Test Site", "A test idea", "modern", "friendly");

        when(aiBuilderGenerator.generate(anyString(), anyString(), anyString()))
                .thenReturn(new AiBuilderGenerator.Result("<html>Test</html>", "body {}", "Mock Prompt"));

        // Act
        AiBuilderPreview preview = aiBuilderService.createPreview(userId, request);

        // Assert
        assertNotNull(preview);
        assertEquals("Test Site", preview.getTitle());
        assertEquals("<html>Test</html>", preview.getHtml());
        assertEquals(1, preview.getStatus()); // STATUS_READY
        assertNotNull(preview.getGenerationTimeMs());
    }

    @Test
    public void testDeploy() {
        // First create
        when(aiBuilderGenerator.generate(anyString(), anyString(), anyString()))
                .thenReturn(new AiBuilderGenerator.Result("<html></html>", "", ""));
        AiBuilderPreview preview = aiBuilderService.createPreview(1001, new AiBuilderRequest());

        // Then deploy
        boolean success = aiBuilderService.deployPreview(preview.getId(), new AiBuilderDeployRequest("vercel"));

        // Assert
        assertTrue(success);
        AiBuilderPreview updated = aiBuilderService.getPreview(preview.getId());
        assertEquals(2, updated.getStatus()); // STATUS_DEPLOYED
        assertTrue(updated.getDeploymentUrl().contains("vercel"));
    }
}
