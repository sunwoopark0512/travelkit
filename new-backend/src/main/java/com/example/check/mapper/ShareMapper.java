package com.example.check.mapper;

import com.example.check.pojo.Share;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 分享Mapper接口
 */
@Mapper
public interface ShareMapper {
    
    /**
     * 根据ID查询分享
     */
    Share selectById(@Param("id") Integer id);
    
    /**
     * 根据分享码查询分享
     */
    Share selectByShareCode(@Param("shareCode") String shareCode);
    
    /**
     * 根据行程ID查询分享
     */
    Share selectByTripId(@Param("tripId") Integer tripId);
    
    /**
     * 插入分享
     */
    int insert(Share share);
    
    /**
     * 更新分享
     */
    int update(Share share);
    
    /**
     * 删除分享
     */
    int deleteById(@Param("id") Integer id);
    
    /**
     * 增加浏览次数
     */
    int incrementViews(@Param("id") Integer id);
    
    /**
     * 增加分享次数
     */
    int incrementShares(@Param("id") Integer id);
}
