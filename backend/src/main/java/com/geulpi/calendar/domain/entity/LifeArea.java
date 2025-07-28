package com.geulpi.calendar.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "life_areas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LifeArea {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String color;
    
    @Column(nullable = false)
    private String icon;
    
    @Column(nullable = false)
    private Float targetPercentage;
    
    @Column(length = 500)
    private String description;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "life_philosophy_id")
    private LifePhilosophy lifePhilosophy;
}