package com.example.check.scheduler;

import com.example.check.service.InsightsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class InsightsScheduler {

    @Autowired
    private InsightsService insightsService;

    // Process pending scans every 10 seconds
    @Scheduled(fixedRate = 10000)
    public void processScans() {
        insightsService.processPendingJobs();
    }
}
