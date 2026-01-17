package com.example.check.controller;

import com.example.check.config.JwtEdDsaUtil;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
 * Test Controller
 */
@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
public class TestController {

    /**
     * Get HeWeather EdDSA JWT Token (Debug only)
     */
    @GetMapping("/heweather/jwt")
    public String getHeWeatherJwt() {
        try {
            return JwtEdDsaUtil.generateHeWeatherJwt();
        } catch (Exception e) {
            return "JWT Generation Error: " + e.getMessage();
        }
    }

    /**
     * Get City Candidate List
     * 
     * @param dest keyword
     * @return HeWeather API Gzip decompressed city list json
     */
    @GetMapping("/getCityList")
    public ResponseEntity<?> getCityList(@RequestParam String dest) {
        String host = "pn6yvy5tx8.re.qweatherapi.com";
        String jwt;
        try {
            jwt = JwtEdDsaUtil.generateHeWeatherJwt();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("JWT Generation Failed: " + e.getMessage());
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
            return ResponseEntity.status(500).body("City Lookup Failed: " + ex.getMessage());
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
            // Extract only needed fields
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
            return ResponseEntity.status(500).body("City Response Decompress/Parse Error: " + ex.getMessage());
        }
    }

    /**
     * Get 30-day weather by locationId (Frontend should pass city.id from city
     * lookup result)
     * 
     * @param locationId HeWeather City ID
     * @return Weather JSON (Auto Gzip decompressed)
     */
    @GetMapping("/weather30d")
    public ResponseEntity<?> getWeather30d(@RequestParam String locationId) {
        String host = "pn6yvy5tx8.re.qweatherapi.com";
        String jwt;
        try {
            jwt = JwtEdDsaUtil.generateHeWeatherJwt();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("JWT Gen Failed: " + e.getMessage());
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
            return ResponseEntity.status(500).body("Weather API Call Failed: " + ex.getMessage());
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
            return ResponseEntity.status(500).body("Weather Response Decompress/Parse Error: " + ex.getMessage());
        }
    }
}
