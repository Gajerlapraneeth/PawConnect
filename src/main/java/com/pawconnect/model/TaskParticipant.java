package com.pawconnect.model;
import jakarta.persistence.*; import java.time.LocalDateTime;
@Entity @Table(uniqueConstraints=@UniqueConstraint(columnNames={"task_id","user_email"}))
public class TaskParticipant {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="task_id", nullable=false) private Long taskId; @Column(name="user_email", nullable=false) private String userEmail;
 private LocalDateTime joinedAt=LocalDateTime.now();
 public TaskParticipant(){}
 public Long getId(){return id;} public void setId(Long id){this.id=id;}
 public Long getTaskId(){return taskId;} public void setTaskId(Long taskId){this.taskId=taskId;}
 public String getUserEmail(){return userEmail;} public void setUserEmail(String userEmail){this.userEmail=userEmail;}
 public LocalDateTime getJoinedAt(){return joinedAt;} public void setJoinedAt(LocalDateTime joinedAt){this.joinedAt=joinedAt;}
}
