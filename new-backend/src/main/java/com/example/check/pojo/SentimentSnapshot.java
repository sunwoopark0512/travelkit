package com.example.check.pojo;

import lombok.Data;

@Data
public class SentimentSnapshot {
    private Integer id;
    private Integer jobId;
    private String platform;
    private Integer positiveRatio;
    private Integer neutralRatio;
    private Integer negativeRatio;
}
