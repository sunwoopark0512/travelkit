package com.example.check.controller;

import com.example.check.config.JwtEdDsaUtil;
import com.example.check.pojo.User;
import com.example.check.service.UserService;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import java.util.zip.GZIPInputStream;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;

/**
 * 测试控制器
 */
@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
public class TestController {
    
    @Autowired
    private UserService userService;
    


    /**
     * 获取和风天气EdDSA JWT令牌（调试专用）
     */
    @GetMapping("/heweather/jwt")
    public String getHeWeatherJwt() {
        try {
            return JwtEdDsaUtil.generateHeWeatherJwt();
        } catch (Exception e) {
            return "生成JWT出错:"+e.getMessage();
        }
    }

    /**
     * 获取城市候选列表
     * @param dest 关键词
     * @return 和风API gzip解压后城市列表json
     */
    @GetMapping("/getCityList")
    public ResponseEntity<?> getCityList(@RequestParam String dest) {
        String host = "pn6yvy5tx8.re.qweatherapi.com";
        String jwt;
        try {
            jwt = JwtEdDsaUtil.generateHeWeatherJwt();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("JWT生成失败: " + e.getMessage());
        }
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + jwt);
        headers.set("Host", host);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept-Encoding", "gzip");
        String url = "https://" + host + "/geo/v2/city/lookup?location=" + dest;
        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<byte[]> respLoc;
        try {
            respLoc = restTemplate.exchange(url, HttpMethod.GET, entity, byte[].class);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("查找城市失败: " + ex.getMessage());
        }
        try {
            String ce = respLoc.getHeaders().getFirst("Content-Encoding");
            String json;
            if (ce != null && ce.toLowerCase().contains("gzip")) {
                InputStream gis = new GZIPInputStream(new ByteArrayInputStream(respLoc.getBody()));
                json = new String(gis.readAllBytes(), StandardCharsets.UTF_8);
            } else {
                json = new String(respLoc.getBody(), StandardCharsets.UTF_8);
            }
            // 只取需要的字段
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(json);
            JsonNode locArr = root.get("location");
            List<Object> list = new ArrayList<>();
            if (locArr != null && locArr.isArray()) {
                for (JsonNode n : locArr) {
                    HashMap<String, Object> item = new HashMap<>();
                    item.put("id", n.path("id").asText(""));
                    item.put("name", n.path("name").asText(""));
                    item.put("adm2", n.path("adm2").asText(""));
                    item.put("adm1", n.path("adm1").asText(""));
                    item.put("country", n.path("country").asText(""));
                    list.add(item);
                }
            }
            return ResponseEntity.ok(list);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("城市响应解压/解析或字段提取错误: " + ex.getMessage());
        }
    }

    /**
     * 输入locationId，获取30天天气（前端应从城市联想结果选择后传city.id来查）
     * @param locationId 和风城市id
     * @return 天气json（gzip自动解压）
     */
    @GetMapping("/weather30d")
    public ResponseEntity<?> getWeather30d(@RequestParam String locationId) {
        String host = "pn6yvy5tx8.re.qweatherapi.com";
        String jwt;
        try {
            jwt = JwtEdDsaUtil.generateHeWeatherJwt();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("JWT生成失败: " + e.getMessage());
        }
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + jwt);
        headers.set("Host", host);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept-Encoding", "gzip");
        String url = String.format("https://%s/v7/weather/30d?location=%s", host, locationId);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<byte[]> respWeather;
        try {
            respWeather = restTemplate.exchange(url, HttpMethod.GET, entity, byte[].class);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("天气接口调用失败: " + ex.getMessage());
        }
        try {
            String ce = respWeather.getHeaders().getFirst("Content-Encoding");
            String json;
            if (ce != null && ce.toLowerCase().contains("gzip")) {
                InputStream gis = new GZIPInputStream(new ByteArrayInputStream(respWeather.getBody()));
                json = new String(gis.readAllBytes(), StandardCharsets.UTF_8);
            } else {
                json = new String(respWeather.getBody(), StandardCharsets.UTF_8);
            }
            MediaType jsonUtf8 = new MediaType("application", "json", StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .contentType(jsonUtf8)
                    .body(json);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("天气结果解压/解析错误: " + ex.getMessage());
        }
    }
}
