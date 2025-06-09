// src/user/entities/user.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { Exclude } from 'class-transformer'; // **** 1. 导入 Exclude ****

export enum UserStatusEnum {
    ACTIVE = 'active',
    PENDING_VERIFICATION = 'pending_verification',
    SUSPENDED = 'suspended',
    DELETED = 'deleted',
}

@Entity({ name: 'users', schema: 'hiking_user_schema' })
@Index('idx_users_status', ['status'])
@Index('idx_users_roles', ['roles'], { using: 'GIN' } as any) // 您之前的 as any 解决方式
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    email: string;

    @Exclude() // **** 2. 在 passwordHash 属性上添加 @Exclude() ****
    @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: false })
    passwordHash: string;

    // ... 其他属性 (nickname, avatarUrl, etc.) 保持不变 ...
    @Column({ type: 'varchar', length: 100, unique: true, nullable: true, default: null })
    nickname?: string;

    @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true, default: null })
    avatarUrl?: string;

    @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true, default: null })
    firstName?: string;

    @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true, default: null })
    lastName?: string;

    @Column({ type: 'text', nullable: true, default: null })
    bio?: string;

    @Column({ name: 'phone_number', type: 'varchar', length: 30, unique: true, nullable: true, default: null })
    phoneNumber?: string;

    @Column({ type: 'integer', nullable: false, default: 0 })
    points: number;

    @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true, default: null })
    emailVerifiedAt?: Date;

    @Column({
        type: 'enum',
        enum: UserStatusEnum,
        enumName: 'user_status_enum',
        nullable: false,
        default: UserStatusEnum.PENDING_VERIFICATION,
    })
    status: UserStatusEnum;

    @Column({
        type: 'text',
        array: true,
        nullable: false,
        default: () => "ARRAY['ROLE_USER']::TEXT[]",
    })
    roles: string[];

    @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true, default: null })
    lastLoginAt?: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
    updatedAt: Date;
}