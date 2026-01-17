package com.example.check.mapper;

import com.example.check.pojo.Share;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * Share Mapper Interface
 */
@Mapper
public interface ShareMapper {

    /**
     * Get share by ID
     */
    Share selectById(@Param("id") Integer id);

    /**
     * Get share by share code
     */
    Share selectByShareCode(@Param("shareCode") String shareCode);

    /**
     * Get share by trip ID
     */
    Share selectByTripId(@Param("tripId") Integer tripId);

    /**
     * Insert share
     */
    int insert(Share share);

    /**
     * Update share
     */
    int update(Share share);

    /**
     * Delete share
     */
    int deleteById(@Param("id") Integer id);

    /**
     * Increment view count
     */
    int incrementViews(@Param("id") Integer id);

    /**
     * Increment share count
     */
    int incrementShares(@Param("id") Integer id);
}
