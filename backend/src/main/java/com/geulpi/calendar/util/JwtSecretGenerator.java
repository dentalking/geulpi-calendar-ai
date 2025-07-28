package com.geulpi.calendar.util;

import java.security.SecureRandom;
import java.util.Base64;

public class JwtSecretGenerator {
    
    public static void main(String[] args) {
        // 512 비트 (64 바이트) 랜덤 키 생성
        SecureRandom secureRandom = new SecureRandom();
        byte[] keyBytes = new byte[64];
        secureRandom.nextBytes(keyBytes);
        
        // Base64로 인코딩
        String encodedKey = Base64.getEncoder().encodeToString(keyBytes);
        
        System.out.println("Generated JWT Secret Key:");
        System.out.println(encodedKey);
        System.out.println("\nAdd this to your environment variables:");
        System.out.println("JWT_SECRET=" + encodedKey);
    }
}