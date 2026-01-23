package com.example.check.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 发布请求
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AiBuilderDeployRequest {
    private String platform;
}
