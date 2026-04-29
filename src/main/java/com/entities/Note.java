package com.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.*;
@Entity
@Table(name ="NOTES")
public class Note {
    private int id ;
    private String content;
    private String title;
    private Date addeddate;

    public Note() {
    }

    public Note( String content, String title, Date addeddate) {
        this.id = new Random().nextInt(10000);
        this.content = content;
        this.title = title;
        this.addeddate = addeddate;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Date getAddeddate() {
        return addeddate;
    }

    public void setAddeddate(Date addeddate) {
        this.addeddate = addeddate;
    }
}
