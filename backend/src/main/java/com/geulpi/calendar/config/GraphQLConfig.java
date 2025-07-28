package com.geulpi.calendar.config;

import graphql.analysis.MaxQueryComplexityInstrumentation;
import graphql.analysis.MaxQueryDepthInstrumentation;
import graphql.execution.instrumentation.ChainedInstrumentation;
import graphql.execution.instrumentation.Instrumentation;
import graphql.scalars.ExtendedScalars;
import graphql.schema.GraphQLScalarType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

import java.util.Arrays;

@Configuration
public class GraphQLConfig {
    
    @Bean
    public RuntimeWiringConfigurer runtimeWiringConfigurer() {
        return wiringBuilder -> wiringBuilder
                .scalar(ExtendedScalars.DateTime)
                .scalar(ExtendedScalars.Date)
                .scalar(ExtendedScalars.Time)
                .scalar(ExtendedScalars.Json);
    }
    
    @Bean
    public Instrumentation graphQLInstrumentation() {
        return new ChainedInstrumentation(Arrays.asList(
            // Query complexity analysis to prevent DoS attacks
            new MaxQueryComplexityInstrumentation(1000),
            // Query depth analysis 
            new MaxQueryDepthInstrumentation(15)
        ));
    }
}