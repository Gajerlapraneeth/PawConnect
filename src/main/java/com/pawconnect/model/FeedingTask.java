package com.pawconnect.model;
import jakarta.persistence.*; import java.time.LocalDate; import java.time.LocalTime; import java.time.LocalDateTime;
@Entity
public class FeedingTask {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private String title;
 @Column(nullable=false) private Long feedingSpotId;
 private LocalDate taskDate; private LocalTime taskTime;
 @Column(nullable=false) private String status="OPEN";
 private String createdBy; private LocalDateTime createdAt=LocalDateTime.now();
 public FeedingTask(){}
 public Long getId(){return id;} public void setId(Long id){this.id=id;}
 public String getTitle(){return title;} public void setTitle(String title){this.title=title;}
 public Long getFeedingSpotId(){return feedingSpotId;} public void setFeedingSpotId(Long feedingSpotId){this.feedingSpotId=feedingSpotId;}
 public LocalDate getTaskDate(){return taskDate;} public void setTaskDate(LocalDate taskDate){this.taskDate=taskDate;}
 public LocalTime getTaskTime(){return taskTime;} public void setTaskTime(LocalTime taskTime){this.taskTime=taskTime;}
 public String getStatus(){return status;} public void setStatus(String status){this.status=status;}
 public String getCreatedBy(){return createdBy;} public void setCreatedBy(String createdBy){this.createdBy=createdBy;}
 public LocalDateTime getCreatedAt(){return createdAt;} public void setCreatedAt(LocalDateTime createdAt){this.createdAt=createdAt;}
}
