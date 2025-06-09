import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ActivityModule } from './activity/activity.module';
import {UserModule} from "./user/user.module";
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使 ConfigModule 在全局可用
      envFilePath: '.env', // 指定 .env 文件路径
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<string>('DB_TYPE') as any, // 'postgres'
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE_NAME'),
        autoLoadEntities: true,
        // entities 将在各个模块中通过 forFeature 注册，这里可以不指定全局 entities
        // 或者如果您想在这里指定所有实体，也可以：
        // entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true, // 开发环境中可以使用，它会自动创建数据库表。生产环境建议设为 false，并使用迁移。
        // logging: true, // 可以在开发时查看 TypeORM 生成的 SQL
        // 对于 PostgreSQL，如果 schema 不是 'public'，通常不需要在这里指定全局 schema，
        // 而是在每个 Entity 中指定。
      }),
    }),
    UserModule,
    ActivityModule,
    AuthModule,
  ],
  controllers: [AppController], // 如果有
  providers: [AppService],    // 如果有
})
export class AppModule {}
