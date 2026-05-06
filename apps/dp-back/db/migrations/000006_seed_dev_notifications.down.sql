DELETE FROM notifications n
WHERE n.id IN (
  SELECT substr(md5(u.id || ':n1'), 1, 16) FROM users u
  UNION ALL SELECT substr(md5(u.id || ':n2'), 1, 16) FROM users u
  UNION ALL SELECT substr(md5(u.id || ':n3'), 1, 16) FROM users u
  UNION ALL SELECT substr(md5(u.id || ':n4'), 1, 16) FROM users u
);
