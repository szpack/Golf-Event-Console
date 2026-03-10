// ============================================================
// importCourses.js — 将 courses.json 导入到 ClubStore
// 在浏览器控制台运行此脚本
// ============================================================

(function(){
  // 球场数据（从 courses.json 提取）
  const coursesData = {
    "version": "3.1",
    "clubs": [
      {
        "id": "shahe",
        "name": "沙河高尔夫球会",
        "name_en": "Shahe Golf Club",
        "city": "深圳",
        "province": "广东",
        "country": "CN",
        "routingMode": "composable_9",
        "status": "operating",
        "nines": [
          { "id": "shahe-A", "name": "A场", "holeCount": 9, "holes": [
            { "number": 1, "par": 4 }, { "number": 2, "par": 5 }, { "number": 3, "par": 4 },
            { "number": 4, "par": 4 }, { "number": 5, "par": 5 }, { "number": 6, "par": 3 },
            { "number": 7, "par": 4 }, { "number": 8, "par": 4 }, { "number": 9, "par": 4 }
          ]},
          { "id": "shahe-B", "name": "B场", "holeCount": 9, "holes": [
            { "number": 1, "par": 4 }, { "number": 2, "par": 5 }, { "number": 3, "par": 3 },
            { "number": 4, "par": 4 }, { "number": 5, "par": 5 }, { "number": 6, "par": 3 },
            { "number": 7, "par": 4 }, { "number": 8, "par": 3 }, { "number": 9, "par": 4 }
          ]},
          { "id": "shahe-C", "name": "C场", "holeCount": 9, "holes": [
            { "number": 1, "par": 5 }, { "number": 2, "par": 4 }, { "number": 3, "par": 5 },
            { "number": 4, "par": 3 }, { "number": 5, "par": 4 }, { "number": 6, "par": 3 },
            { "number": 7, "par": 4 }, { "number": 8, "par": 4 }, { "number": 9, "par": 4 }
          ]}
        ],
        "layouts": [
          { "id": "shahe-AB", "name": "A + B", "segments": ["shahe-A", "shahe-B"] },
          { "id": "shahe-AC", "name": "A + C", "segments": ["shahe-A", "shahe-C"] },
          { "id": "shahe-BC", "name": "B + C", "segments": ["shahe-B", "shahe-C"] }
        ]
      },
      {
        "id": "xili",
        "name": "西丽高尔夫乡村俱乐部",
        "name_en": "Xili Golf Club",
        "city": "深圳",
        "province": "广东",
        "country": "CN",
        "routingMode": "composable_9",
        "status": "operating",
        "nines": [
          { "id": "xili-A", "name": "A场", "holeCount": 9, "holes": [
            { "number": 1, "par": 5 }, { "number": 2, "par": 4 }, { "number": 3, "par": 5 },
            { "number": 4, "par": 4 }, { "number": 5, "par": 3 }, { "number": 6, "par": 4 },
            { "number": 7, "par": 4 }, { "number": 8, "par": 3 }, { "number": 9, "par": 4 }
          ]},
          { "id": "xili-B", "name": "B场", "holeCount": 9, "holes": [
            { "number": 1, "par": 4 }, { "number": 2, "par": 4 }, { "number": 3, "par": 3 },
            { "number": 4, "par": 5 }, { "number": 5, "par": 3 }, { "number": 6, "par": 4 },
            { "number": 7, "par": 4 }, { "number": 8, "par": 5 }, { "number": 9, "par": 4 }
          ]},
          { "id": "xili-C", "name": "C场", "holeCount": 9, "holes": [
            { "number": 1, "par": 4 }, { "number": 2, "par": 4 }, { "number": 3, "par": 5 },
            { "number": 4, "par": 3 }, { "number": 5, "par": 4 }, { "number": 6, "par": 4 },
            { "number": 7, "par": 4 }, { "number": 8, "par": 3 }, { "number": 9, "par": 5 }
          ]},
          { "id": "xili-D", "name": "D场", "holeCount": 9, "holes": [
            { "number": 1, "par": 5 }, { "number": 2, "par": 4 }, { "number": 3, "par": 4 },
            { "number": 4, "par": 4 }, { "number": 5, "par": 4 }, { "number": 6, "par": 3 },
            { "number": 7, "par": 4 }, { "number": 8, "par": 5 }, { "number": 9, "par": 3 }
          ]}
        ],
        "layouts": [
          { "id": "xili-AB", "name": "A + B", "segments": ["xili-A", "xili-B"] },
          { "id": "xili-AC", "name": "A + C", "segments": ["xili-A", "xili-C"] },
          { "id": "xili-AD", "name": "A + D", "segments": ["xili-A", "xili-D"] },
          { "id": "xili-BC", "name": "B + C", "segments": ["xili-B", "xili-C"] },
          { "id": "xili-BD", "name": "B + D", "segments": ["xili-B", "xili-D"] },
          { "id": "xili-CD", "name": "C + D", "segments": ["xili-C", "xili-D"] }
        ]
      },
      {
        "id": "hidden_grace",
        "name": "隐秀高尔夫俱乐部",
        "name_en": "Hidden Grace Golf Club",
        "aliases": ["正中高尔夫球会"],
        "city": "深圳",
        "province": "广东",
        "country": "CN",
        "routingMode": "fixed_18",
        "status": "operating",
        "nines": [
          { "id": "hidden_grace-A-front", "name": "A场前9", "holeCount": 9, "holes": [
            { "number": 1, "par": 4 }, { "number": 2, "par": 5 }, { "number": 3, "par": 3 },
            { "number": 4, "par": 4 }, { "number": 5, "par": 4 }, { "number": 6, "par": 4 },
            { "number": 7, "par": 4 }, { "number": 8, "par": 3 }, { "number": 9, "par": 5 }
          ]},
          { "id": "hidden_grace-A-back", "name": "A场后9", "holeCount": 9, "holes": [
            { "number": 10, "par": 4 }, { "number": 11, "par": 4 }, { "number": 12, "par": 3 },
            { "number": 13, "par": 5 }, { "number": 14, "par": 4 }, { "number": 15, "par": 4 },
            { "number": 16, "par": 3 }, { "number": 17, "par": 5 }, { "number": 18, "par": 4 }
          ]}
        ],
        "layouts": [
          { "id": "hidden_grace-A", "name": "A场", "segments": ["hidden_grace-A-front", "hidden_grace-A-back"] }
        ]
      }
    ]
  };

  // 导入到 ClubStore
  let imported = 0;
  const now = new Date().toISOString();

  coursesData.clubs.forEach(club => {
    // 检查是否已存在
    const existing = ClubStore.get(club.id);
    if (existing) {
      console.log(`[Import] 跳过已存在的球场: ${club.name}`);
      return;
    }

    // 构建 ClubStore 格式的球场数据
    const clubData = {
      id: club.id,
      name: club.name,
      name_en: club.name_en || '',
      aliases: club.aliases || [],
      city: club.city,
      province: club.province,
      district: '',
      country: club.country || 'CN',
      geo: club.geo || null,
      status: club.status || 'operating',
      status_source: 'import',
      status_as_of: now,
      verification_level: 'user_verified',
      source: 'import',
      nines: club.nines || [],
      layouts: club.layouts || [],
      tee_sets: [],
      createdAt: now,
      updatedAt: now
    };

    // 保存到 ClubStore
    ClubStore.put(clubData);
    imported++;
    console.log(`[Import] 已导入: ${club.name}`);
  });

  console.log(`[Import] 完成！共导入 ${imported} 个球场`);
  alert(`成功导入 ${imported} 个球场！请刷新页面后创建球局。`);
})();
