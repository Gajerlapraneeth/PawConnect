package com.pawconnect.model;
import jakarta.persistence.*; import java.time.LocalDateTime;
@Entity
public class AnimalReport {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private String animalType;
 @Column(nullable=false,length=2000) private String description;
 @Column(nullable=false) private String location;
 private String reportedBy; private String contact; private String status="PENDING";
 private LocalDateTime createdAt=LocalDateTime.now();
 public AnimalReport(){}
 public Long getId(){return id;} public void setId(Long id){this.id=id;}
 public String getAnimalType(){return animalType;} public void setAnimalType(String animalType){this.animalType=animalType;}
 public String getDescription(){return description;} public void setDescription(String description){this.description=description;}
 public String getLocation(){return location;} public void setLocation(String location){this.location=location;}
 public String getReportedBy(){return reportedBy;} public void setReportedBy(String reportedBy){this.reportedBy=reportedBy;}
 public String getContact(){return contact;} public void setContact(String contact){this.contact=contact;}
 public String getStatus(){return status;} public void setStatus(String status){this.status=status;}
 public LocalDateTime getCreatedAt(){return createdAt;} public void setCreatedAt(LocalDateTime createdAt){this.createdAt=createdAt;}
}
