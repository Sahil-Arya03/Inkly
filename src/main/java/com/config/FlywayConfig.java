package com.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

import javax.sql.DataSource;

/**
 * Explicit Flyway wiring for Spring Boot 4.x.
 *
 * Spring Boot 4.x removed Flyway from its auto-configuration module as part
 * of the modular split. This bean replaces what FlywayAutoConfiguration used
 * to do: it reads the same spring.flyway.* properties and runs migrate()
 * before any JPA repository is called.
 */
@Configuration
@Slf4j
public class FlywayConfig {

    @Bean(name = "flyway")
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public Flyway flyway(
            DataSource dataSource,
            @Value("${spring.flyway.locations:classpath:db/migration}") String locations,
            @Value("${spring.flyway.baseline-on-migrate:false}") boolean baselineOnMigrate,
            @Value("${spring.flyway.baseline-version:1}") String baselineVersion) {

        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations(locations)
                .baselineOnMigrate(baselineOnMigrate)
                .baselineVersion(baselineVersion)
                .load();

        MigrateResult result = flyway.migrate();
        log.info("[flyway] Applied {} migration(s); current version: {}",
                result.migrationsExecuted, result.targetSchemaVersion);
        return flyway;
    }
}
