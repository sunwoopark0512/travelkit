package com.example.check.pojo;

import lombok.Data;

@Data
public class KeywordGap {
    private Integer id;
    private Integer jobId;
    private String keyword;
    private Integer competitorVolume;
    private Integer ourVolume;
    private Integer difficulty;
}
