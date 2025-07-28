package com.geulpi.calendar.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    private String address;
    
    @Embedded
    private Coordinates coordinates;
    
    private String placeId; // Google Places ID
    
    @OneToOne
    @JoinColumn(name = "event_id")
    private Event event;
}

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
class Coordinates {
    private Float latitude;
    private Float longitude;
}