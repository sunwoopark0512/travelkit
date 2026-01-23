package com.example.check.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 生成器输入模型
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AiBuilderRequest {
    private String title;
    private String idea;
    private String theme;
    private String tone;
}
