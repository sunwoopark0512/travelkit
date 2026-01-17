package com.example.check.controller;

import cn.hutool.core.util.StrUtil;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;

/**
 * Picture Crawler Controller
 */
@RestController
@RequestMapping("/api/picture-crawler")
@CrossOrigin(origins = "*")
public class PictureCrawlerController {

    /**
     * Crawl pictures by keyword
     * 
     * @param keyword Search keyword
     * @param limit   Limit of returned pictures, default 1
     * @return List of picture URLs
     */
    @GetMapping("/search")
    public Map<String, Object> searchPictures(@RequestParam String keyword,
            @RequestParam(defaultValue = "1") int limit) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (keyword == null || keyword.trim().isEmpty()) {
                result.put("success", false);
                result.put("message", "Keyword cannot be empty");
                return result;
            }
            Random random = new Random();
            int num = random.nextInt(100);
            String searchKeyword = keyword.trim();

            // Fetch content
            String fetchUrl = String.format("https://cn.bing.com/images/async?q=%s&first=%s&mmasync=1", searchKeyword,
                    num);
            Document document = null;
            int index = 0;
            List<String> ImageUrl = new ArrayList<>();
            try {
                document = Jsoup.connect(fetchUrl).get();
            } catch (IOException e) {
                result.put("success", false);
                result.put("message", "Crawl failed: " + e.getMessage());
                e.printStackTrace();
                return result;
            }
            // Parse content
            Element div = document.getElementsByClass("dgControl").first();
            if (div == null) {
                result.put("success", false);
                result.put("message", "Crawl failed: ");
                return result;
            }
            Elements imgElementList = div.select("img");
            // Iterate elements, upload pictures
            for (Element imgElement : imgElementList) {
                String fileUrl = imgElement.attr("src");
                if (StrUtil.isBlank(fileUrl)) {
                    continue;
                }
                // Process image URL, prevent escaping and object storage conflicts
                // Find position of ?
                int questionMarkIndex = fileUrl.indexOf("?");
                if (questionMarkIndex > -1) {
                    // Truncate
                    fileUrl = fileUrl.substring(0, questionMarkIndex);
                    ImageUrl.add(fileUrl);
                    index++;
                }
                if (index == limit) {
                    break;
                }
            }
            result.put("success", true);
            result.put("data", ImageUrl);
            result.put("message", "Success");
            System.out.println(ImageUrl);

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Crawl failed: " + e.getMessage());
            e.printStackTrace();
        }
        return result;
    }
}
