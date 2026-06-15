import { DataTypes } from 'sequelize'
import db from '../config/db.js'

export const User = db.define('User', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  firstName:   { type: DataTypes.STRING(60),  allowNull: false },
  lastName:    { type: DataTypes.STRING(60),  allowNull: false },
  email:       { type: DataTypes.STRING(200), allowNull: false, unique: true },
  password:    { type: DataTypes.STRING(200), allowNull: false },
  university:  { type: DataTypes.STRING(100), allowNull: false },
  faculty:     { type: DataTypes.STRING(100), allowNull: true },
  yearOfStudy: { type: DataTypes.INTEGER,     allowNull: true },
  bio:         { type: DataTypes.TEXT,        allowNull: true },
  isAdmin:     { type: DataTypes.BOOLEAN,     defaultValue: false },
  programmeId: { type: DataTypes.UUID,        allowNull: true },
}, { tableName: 'users' })

export const Exam = db.define('Exam', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseName:    { type: DataTypes.STRING(200), allowNull: false },
  courseCode:    { type: DataTypes.STRING(50),  allowNull: true },
  university:    { type: DataTypes.STRING(100), allowNull: false },
  faculty:       { type: DataTypes.STRING(100), allowNull: true },
  year:          { type: DataTypes.INTEGER,     allowNull: false },
  fileUrl:       { type: DataTypes.STRING(500), allowNull: false },
  fileSize:      { type: DataTypes.INTEGER,     allowNull: true },
  downloadCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewCount:     { type: DataTypes.INTEGER, defaultValue: 0 },
  uploadedById:  { type: DataTypes.UUID, allowNull: false },
  isFeatured:    { type: DataTypes.BOOLEAN, defaultValue: false },
  moduleId:      { type: DataTypes.UUID, allowNull: true },
  examType:      { type: DataTypes.ENUM('UE','CAT','supp','mock','other'), defaultValue: 'UE' },
}, { tableName: 'exams' })

export const Note = db.define('Note', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:         { type: DataTypes.STRING(200), allowNull: false },
  description:   { type: DataTypes.TEXT,        allowNull: true },
  university:    { type: DataTypes.STRING(100), allowNull: false },
  faculty:       { type: DataTypes.STRING(100), allowNull: true },
  courseCode:    { type: DataTypes.STRING(50),  allowNull: true },
  fileUrl:       { type: DataTypes.STRING(500), allowNull: false },
  downloadCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  uploadedById:  { type: DataTypes.UUID, allowNull: false },
  isFeatured:    { type: DataTypes.BOOLEAN, defaultValue: false },
  moduleId:      { type: DataTypes.UUID, allowNull: true },
  fileType:      { type: DataTypes.ENUM('pdf','ppt'), defaultValue: 'pdf' },
}, { tableName: 'notes' })

export const Internship = db.define('Internship', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:        { type: DataTypes.STRING(200), allowNull: false },
  company:      { type: DataTypes.STRING(200), allowNull: false },
  location:     { type: DataTypes.STRING(200), allowNull: false },
  description:  { type: DataTypes.TEXT,        allowNull: false },
  requirements: { type: DataTypes.TEXT,        allowNull: true },
  industry:     { type: DataTypes.STRING(100), allowNull: false },
  type:         { type: DataTypes.ENUM('internship','graduate','part-time'), defaultValue: 'internship' },
  isPaid:       { type: DataTypes.BOOLEAN, defaultValue: false },
  salary:       { type: DataTypes.STRING(100), allowNull: true },
  contactEmail: { type: DataTypes.STRING(200), allowNull: true },
  isActive:     { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'internships' })

export const Application = db.define('Application', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:       { type: DataTypes.UUID, allowNull: false },
  internshipId: { type: DataTypes.UUID, allowNull: false },
  coverLetter:  { type: DataTypes.TEXT, allowNull: true },
  status:       { type: DataTypes.ENUM('PENDING','REVIEWED','SHORTLISTED','REJECTED'), defaultValue: 'PENDING' },
}, { tableName: 'applications' })

export const Activity = db.define('Activity', {
  id:     { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type:   { type: DataTypes.STRING(50),  allowNull: false },
  title:  { type: DataTypes.STRING(200), allowNull: false },
}, { tableName: 'activities' })

export const AiUsage = db.define('AiUsage', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:      { type: DataTypes.UUID, allowNull: false },
  question:    { type: DataTypes.TEXT, allowNull: false },
  explanation: { type: DataTypes.TEXT, allowNull: false },
  language:    { type: DataTypes.STRING(20), defaultValue: 'english' },
}, { tableName: 'ai_usage' })

export const Bookmark = db.define('Bookmark', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:       { type: DataTypes.UUID, allowNull: false },
  resourceType: { type: DataTypes.ENUM('exam','note'), allowNull: false },
  resourceId:   { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'bookmarks' })

export const Notification = db.define('Notification', {
  id:     { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type:   { type: DataTypes.STRING(50), allowNull: false },
  title:  { type: DataTypes.STRING(200), allowNull: false },
  body:   { type: DataTypes.STRING(500), allowNull: true },
  link:   { type: DataTypes.STRING(300), allowNull: true },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'notifications' })

export const Review = db.define('Review', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:         { type: DataTypes.UUID, allowNull: false },
  courseCode:     { type: DataTypes.STRING(50),  allowNull: false },
  courseName:     { type: DataTypes.STRING(200), allowNull: false },
  university:     { type: DataTypes.STRING(100), allowNull: false },
  difficulty:     { type: DataTypes.INTEGER, allowNull: false },
  lecturerRating: { type: DataTypes.INTEGER, allowNull: false },
  overallRating:  { type: DataTypes.INTEGER, allowNull: false },
  comment:        { type: DataTypes.TEXT, allowNull: true },
  semester:       { type: DataTypes.STRING(30), allowNull: true },
  faculty:        { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'reviews' })

export const Comment = db.define('Comment', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:       { type: DataTypes.UUID, allowNull: false },
  resourceType: { type: DataTypes.ENUM('exam','note'), allowNull: false },
  resourceId:   { type: DataTypes.UUID, allowNull: false },
  body:         { type: DataTypes.TEXT, allowNull: false },
  parentId:     { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'comments' })

export const Report = db.define('Report', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:       { type: DataTypes.UUID, allowNull: false },
  resourceType: { type: DataTypes.ENUM('exam','note','comment'), allowNull: false },
  resourceId:   { type: DataTypes.UUID, allowNull: false },
  reason:       { type: DataTypes.ENUM('wrong_content','copyright','inappropriate','spam','other'), allowNull: false },
  details:      { type: DataTypes.TEXT, allowNull: true },
  status:       { type: DataTypes.ENUM('PENDING','REVIEWED','RESOLVED','DISMISSED'), defaultValue: 'PENDING' },
  resolvedById: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'reports' })

// ── Associations ──────────────────────────────────────────────
User.hasMany(Exam,          { foreignKey: 'uploadedById', as: 'exams' })
Exam.belongsTo(User,        { foreignKey: 'uploadedById', as: 'uploadedBy' })
User.hasMany(Note,          { foreignKey: 'uploadedById', as: 'notes' })
Note.belongsTo(User,        { foreignKey: 'uploadedById', as: 'uploadedBy' })
User.hasMany(Activity,      { foreignKey: 'userId' })
Activity.belongsTo(User,    { foreignKey: 'userId' })
User.hasMany(AiUsage,       { foreignKey: 'userId' })
AiUsage.belongsTo(User,     { foreignKey: 'userId' })
User.hasMany(Application,         { foreignKey: 'userId' })
Internship.hasMany(Application,   { foreignKey: 'internshipId', as: 'applications' })
Application.belongsTo(User,       { foreignKey: 'userId' })
Application.belongsTo(Internship, { foreignKey: 'internshipId' })
User.hasMany(Bookmark,      { foreignKey: 'userId' })
Bookmark.belongsTo(User,    { foreignKey: 'userId' })
User.hasMany(Notification,  { foreignKey: 'userId' })
Notification.belongsTo(User,{ foreignKey: 'userId' })
User.hasMany(Review,        { foreignKey: 'userId' })
Review.belongsTo(User,      { foreignKey: 'userId', as: 'author' })
User.hasMany(Comment,       { foreignKey: 'userId' })
Comment.belongsTo(User,     { foreignKey: 'userId', as: 'author' })
Comment.hasMany(Comment,    { foreignKey: 'parentId', as: 'replies' })
Comment.belongsTo(Comment,  { foreignKey: 'parentId', as: 'parent' })
User.hasMany(Report,        { foreignKey: 'userId' })
Report.belongsTo(User,      { foreignKey: 'userId', as: 'reporter' })
Report.belongsTo(User,      { foreignKey: 'resolvedById', as: 'resolvedBy' })

export default db

// ── Notes Marketplace ─────────────────────────────────────────
export const NoteRequest = db.define('NoteRequest', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:      { type: DataTypes.UUID, allowNull: false },
  courseCode:  { type: DataTypes.STRING(50),  allowNull: false },
  courseName:  { type: DataTypes.STRING(200), allowNull: false },
  university:  { type: DataTypes.STRING(100), allowNull: false },
  faculty:     { type: DataTypes.STRING(100), allowNull: true },
  description: { type: DataTypes.TEXT,        allowNull: true },
  status:      { type: DataTypes.ENUM('open','fulfilled'), defaultValue: 'open' },
  fulfillCount:{ type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'note_requests' })

// ── Academic Hierarchy ────────────────────────────────────────
// University → College → Programme → Module → Topic

export const College = db.define('College', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  shortName:   { type: DataTypes.STRING(50),  allowNull: true },
  university:  { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT,        allowNull: true },
  icon:        { type: DataTypes.STRING(10),  allowNull: true },
}, { tableName: 'colleges', indexes: [{ unique: true, fields: ['name','university'] }] })

export const Programme = db.define('Programme', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  code:        { type: DataTypes.STRING(20),  allowNull: true },
  collegeId:   { type: DataTypes.UUID,        allowNull: false },
  duration:    { type: DataTypes.INTEGER,     allowNull: true },  // years
  description: { type: DataTypes.TEXT,        allowNull: true },
  degreeLevel: { type: DataTypes.ENUM('certificate','diploma','bachelor','masters','phd'), defaultValue: 'bachelor' },
}, { tableName: 'programmes' })

export const Module = db.define('Module', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:         { type: DataTypes.STRING(200), allowNull: false },
  code:         { type: DataTypes.STRING(20),  allowNull: false },
  programmeId:  { type: DataTypes.UUID,        allowNull: false },
  yearOfStudy:  { type: DataTypes.INTEGER,     allowNull: false }, // 1,2,3,4
  semester:     { type: DataTypes.ENUM('1','2','full-year'), defaultValue: '1' },
  credits:      { type: DataTypes.INTEGER,     allowNull: true },
  description:  { type: DataTypes.TEXT,        allowNull: true },
  isCore:       { type: DataTypes.BOOLEAN,     defaultValue: true },
}, { tableName: 'modules' })

export const Topic = db.define('Topic', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  moduleId:    { type: DataTypes.UUID,        allowNull: false },
  orderIndex:  { type: DataTypes.INTEGER,     defaultValue: 0 },
  description: { type: DataTypes.TEXT,        allowNull: true },
}, { tableName: 'topics' })

// ── Course Catalogue (kept for legacy, now linked to Module) ──
export const Course = db.define('Course', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseCode:  { type: DataTypes.STRING(50),  allowNull: false },
  courseName:  { type: DataTypes.STRING(200), allowNull: false },
  university:  { type: DataTypes.STRING(100), allowNull: false },
  faculty:     { type: DataTypes.STRING(100), allowNull: false },
  year:        { type: DataTypes.STRING(20),  allowNull: true },
  semester:    { type: DataTypes.STRING(20),  allowNull: true },
  description: { type: DataTypes.TEXT,        allowNull: true },
  credits:     { type: DataTypes.INTEGER,     allowNull: true },
  moduleId:    { type: DataTypes.UUID,        allowNull: true }, // optional link to Module
}, { tableName: 'courses', indexes: [{ unique: true, fields: ['course_code','university'] }] })

// ── Hierarchy associations ─────────────────────────────────────
College.hasMany(Programme,    { foreignKey: 'collegeId', as: 'programmes' })
Programme.belongsTo(College,  { foreignKey: 'collegeId', as: 'college' })
Programme.hasMany(Module,     { foreignKey: 'programmeId', as: 'modules' })
Module.belongsTo(Programme,   { foreignKey: 'programmeId', as: 'programme' })
Module.hasMany(Topic,         { foreignKey: 'moduleId', as: 'topics' })
Topic.belongsTo(Module,       { foreignKey: 'moduleId', as: 'module' })
Module.hasMany(Course,        { foreignKey: 'moduleId', as: 'courses' })
Course.belongsTo(Module,      { foreignKey: 'moduleId', as: 'module' })

// Exams and Notes linked to Module for structured browsing
Exam.belongsTo(Module,  { foreignKey: 'moduleId', as: 'module' })
Module.hasMany(Exam,    { foreignKey: 'moduleId', as: 'exams' })
Note.belongsTo(Module,  { foreignKey: 'moduleId', as: 'module' })
Module.hasMany(Note,    { foreignKey: 'moduleId', as: 'notes' })

// User linked to Programme
User.belongsTo(Programme, { foreignKey: 'programmeId', as: 'programme' })
Programme.hasMany(User,   { foreignKey: 'programmeId', as: 'students' })

// ── Notes Marketplace ─────────────────────────────────────────
// Associations
User.hasMany(NoteRequest,       { foreignKey: 'userId' })
NoteRequest.belongsTo(User,     { foreignKey: 'userId', as: 'requester' })
