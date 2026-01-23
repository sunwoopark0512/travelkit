package com.example.check.pojo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BrandMention {
    private Integer id;
    private Integer jobId;
    private String sourceName;
    private String url;
    private String snippet;
    private String sentiment; // positive, neutral, negative

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime mentionDate;
}
