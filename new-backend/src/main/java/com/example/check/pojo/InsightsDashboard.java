package com.example.check.pojo;

import lombok.Data;
import java.util.List;

@Data
public class InsightsDashboard {
    private InsightScanJob job;
    private List<BrandMention> mentions;
    private List<SentimentSnapshot> sentiments;
    private List<KeywordGap> keywords;
    private List<CompetitivePosition> positions;
}
