package com.example.check.pojo;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CompetitivePosition {
    private Integer id;
    private Integer jobId;
    private String competitorName;
    private BigDecimal marketShare;
    private BigDecimal growthRate;
}
