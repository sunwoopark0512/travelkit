package com.example.check.controller;

import cn.hutool.core.util.ObjUtil;
import cn.hutool.core.util.StrUtil;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;

/**
 * 图片爬虫控制器
 */
@RestController
@RequestMapping("/api/picture-crawler")
@CrossOrigin(origins = "*")
public class PictureCrawlerController {

    /**
     * 根据关键字爬取图片
     * @param keyword 搜索关键字
     * @param limit 返回图片数量限制，默认1
     * @return 图片URL列表
     */
    @GetMapping("/search")
    public Map<String, Object> searchPictures(@RequestParam String keyword,
                                               @RequestParam(defaultValue = "1") int limit) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (keyword == null || keyword.trim().isEmpty()) {
                result.put("success", false);
                result.put("message", "关键字不能为空");
                return result;
            }
            Random random=new Random();
            int num=random.nextInt(100);
            String searchKeyword = keyword.trim();

            //抓取内容
            String fetchUrl=String.format("https://cn.bing.com/images/async?q=%s&first=%s&mmasync=1",searchKeyword,num);
            Document document = null;
            int index=0;
            List<String>ImageUrl=new ArrayList<>();
            try {
                document = Jsoup.connect(fetchUrl).get();
            } catch (IOException e) {
                result.put("success", false);
                result.put("message", "爬取失败：" + e.getMessage());
                e.printStackTrace();
            }
            //解析内容
            Element div = document.getElementsByClass("dgControl").first();
            if(ObjUtil.isNull(div)){
                result.put("success", false);
                result.put("message", "爬取失败：");
            }
            Elements imgElementList = div.select("img");
            //遍历元素,依次上传图片
            for (Element imgElement : imgElementList) {
                String fileUrl = imgElement.attr("src");
                if(StrUtil.isBlank(fileUrl)){
                    continue;
                }
                //处理图片的地址，防止转义和对象存储冲突的问题
                //查找 ？的位置
                int questionMarkIndex = fileUrl.indexOf("?");
                if (questionMarkIndex>-1){
                    //截断
                    fileUrl=fileUrl.substring(0,questionMarkIndex);
                    ImageUrl.add(fileUrl);
                    index++;
                }
                if(index==limit){
                   break;
                }
            }
                result.put("success", true);
                result.put("data", ImageUrl);
                result.put("message", "获取成功");
                System.out.println(ImageUrl);

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "爬取失败：" + e.getMessage());
            e.printStackTrace();
        }
        return result;
    }
}

