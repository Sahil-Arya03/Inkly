package com.helper;

import org.hibernate.Session;
import org.hibernate.SessionFactory;

import org.hibernate.cfg.Configuration;

public class factoryprovider {
    public static  SessionFactory factory;
    public Session session;

    public static SessionFactory getFactory()
    {
        if(factory==null)
        {
            factory=new Configuration().configure("hibernate.cfg.xml").buildSessionFactory();
        }
        return factory;
    }

    public static void Closefactory() {
        if(factory.isOpen())
        {
            factory.close();
        }
    }
}
