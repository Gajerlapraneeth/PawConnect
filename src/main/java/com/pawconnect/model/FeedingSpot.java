package com.pawconnect.model;
import jakarta.persistence.*; import java.time.LocalDateTime;
@Entity
public class FeedingSpot {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private String name;
 @Column(nullable=false) private String location;
 private String animalType; private String description; private String createdBy;
 private LocalDateTime createdAt=LocalDateTime.now();
 public FeedingSpot(){}
 public Long getId(){return id;} public void setId(Long id){this.id=id;}
 public String getName(){return name;} public void setName(String name){this.name=name;}
 public String getLocation(){return location;} public void setLocation(String location){this.location=location;}
 public String getAnimalType(){return animalType;} public void setAnimalType(String animalType){this.animalType=animalType;}
 public String getDescription(){return description;} public void setDescription(String description){this.description=description;}
 public String getCreatedBy(){return createdBy;} public void setCreatedBy(String createdBy){this.createdBy=createdBy;}
 public LocalDateTime getCreatedAt(){return createdAt;} public void setCreatedAt(LocalDateTime createdAt){this.createdAt=createdAt;}
}
