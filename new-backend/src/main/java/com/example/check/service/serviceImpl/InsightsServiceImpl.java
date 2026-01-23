package com.example.check.service.serviceImpl;

import com.example.check.mapper.*;
import com.example.check.pojo.*;
import com.example.check.service.InsightsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
public class InsightsServiceImpl implements InsightsService {

    @Autowired
    private InsightScanJobMapper jobMapper;
    @Autowired
    private BrandMentionMapper mentionMapper;
    @Autowired
    private SentimentSnapshotMapper sentimentMapper;
    @Autowired
    private KeywordGapMapper keywordMapper;
    @Autowired
    private CompetitivePositionMapper positionMapper;

    @Override
    public InsightScanJob startScan(Integer userId, String targetUrl) {
        InsightScanJob job = new InsightScanJob();
        job.setUserId(userId);
        job.setTargetUrl(targetUrl);
        job.setStatus(0); // Pending
        LocalDateTime now = LocalDateTime.now();
        job.setCreatedAt(now);
        job.setUpdatedAt(now);

        jobMapper.insert(job);
        return job;
    }

    @Override
    public InsightsDashboard getDashboard(Integer jobId) {
        InsightScanJob job = jobMapper.selectById(jobId);
        if (job == null)
            return null;

        InsightsDashboard dashboard = new InsightsDashboard();
        dashboard.setJob(job);
        dashboard.setMentions(mentionMapper.selectByJobId(jobId));
        dashboard.setSentiments(sentimentMapper.selectByJobId(jobId));
        dashboard.setKeywords(keywordMapper.selectByJobId(jobId));
        dashboard.setPositions(positionMapper.selectByJobId(jobId));

        return dashboard;
    }

    @Override
    public List<InsightScanJob> getUserJobs(Integer userId) {
        return jobMapper.selectByUserId(userId);
    }

    @Override
    @Transactional
    public void processPendingJobs() {
        List<InsightScanJob> pendingJobs = jobMapper.selectPendingJobs();
        if (pendingJobs == null || pendingJobs.isEmpty())
            return;

        for (InsightScanJob job : pendingJobs) {
            // Update status to Running
            job.setStatus(1);
            job.setUpdatedAt(LocalDateTime.now());
            jobMapper.update(job);

            try {
                // Determine mock scenario based on URL
                boolean isCompetitor = job.getTargetUrl().contains("competitor");

                // 1. Generate Mentions
                generateMockMentions(job.getId(), isCompetitor);

                // 2. Generate Sentiment
                generateMockSentiment(job.getId(), isCompetitor);

                // 3. Generate Keyword Gaps
                generateMockKeywords(job.getId(), isCompetitor);

                // 4. Generate Positioning
                generateMockPositions(job.getId(), isCompetitor);

                // Complete
                job.setStatus(2);
                job.setOverallScore(isCompetitor ? 85 : 92); // Random-ish score
                job.setUpdatedAt(LocalDateTime.now());
                jobMapper.update(job);

            } catch (Exception e) {
                e.printStackTrace();
                job.setStatus(-1); // Failed
                jobMapper.update(job);
            }
        }
    }

    private void generateMockMentions(Integer jobId, boolean isCompetitor) {
        Random rand = new Random();
        String[] sources = { "Twitter", "TechCrunch", "Reddit", "LinkedIn News" };
        String[] sentiments = { "positive", "neutral", "negative" };

        for (int i = 0; i < 5; i++) {
            BrandMention m = new BrandMention();
            m.setJobId(jobId);
            m.setSourceName(sources[rand.nextInt(sources.length)]);
            m.setUrl("https://example.com/mention/" + rand.nextInt(1000));
            m.setSnippet(
                    isCompetitor ? "Competitor X just launched a new feature..." : "Our travel kit is saving lives!");
            m.setSentiment(sentiments[rand.nextInt(sentiments.length)]);
            m.setMentionDate(LocalDateTime.now().minusHours(rand.nextInt(48)));
            mentionMapper.insert(m);
        }
    }

    private void generateMockSentiment(Integer jobId, boolean isCompetitor) {
        SentimentSnapshot s1 = new SentimentSnapshot();
        s1.setJobId(jobId);
        s1.setPlatform("Twitter");
        s1.setPositiveRatio(isCompetitor ? 40 : 65);
        s1.setNeutralRatio(30);
        s1.setNegativeRatio(isCompetitor ? 30 : 5);
        sentimentMapper.insert(s1);

        SentimentSnapshot s2 = new SentimentSnapshot();
        s2.setJobId(jobId);
        s2.setPlatform("Reddit");
        s2.setPositiveRatio(50);
        s2.setNeutralRatio(25);
        s2.setNegativeRatio(25);
        sentimentMapper.insert(s2);
    }

    private void generateMockKeywords(Integer jobId, boolean isCompetitor) {
        KeywordGap k1 = new KeywordGap();
        k1.setJobId(jobId);
        k1.setKeyword("travel essential list");
        k1.setCompetitorVolume(5000);
        k1.setOurVolume(1200);
        k1.setDifficulty(75);
        keywordMapper.insert(k1);

        KeywordGap k2 = new KeywordGap();
        k2.setJobId(jobId);
        k2.setKeyword("best packing app");
        k2.setCompetitorVolume(2100);
        k2.setOurVolume(3400);
        k2.setDifficulty(45);
        keywordMapper.insert(k2);
    }

    private void generateMockPositions(Integer jobId, boolean isCompetitor) {
        CompetitivePosition p1 = new CompetitivePosition();
        p1.setJobId(jobId);
        p1.setCompetitorName("Our Brand");
        p1.setMarketShare(new BigDecimal("15.5"));
        p1.setGrowthRate(new BigDecimal("12.4"));
        positionMapper.insert(p1);

        CompetitivePosition p2 = new CompetitivePosition();
        p2.setJobId(jobId);
        p2.setCompetitorName("Major Competitor X");
        p2.setMarketShare(new BigDecimal("35.0"));
        p2.setGrowthRate(new BigDecimal("5.2"));
        positionMapper.insert(p2);
    }
}
