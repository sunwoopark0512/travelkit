package com.example.check.pojo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * AI 生成器预览实体
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AiBuilderPreview {
    private Integer id;
    private Integer userId;
    private String title;
    private String idea;
    private String theme;
    private String tone;
    private String prompt;
    private String html;
    private String css;
    private Integer status;
    private String deploymentUrl;
    private String platform;
    private Long generationTimeMs;
    private String errorMessage;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
