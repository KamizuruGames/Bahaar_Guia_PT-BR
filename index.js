String.prototype.clr = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` };
const Vec3 = require('tera-vec3');

const MapID = 9044;					// https://github.com/neowutran/TeraDpsMeterData/tree/master/dungeons
const ZoneID = 444;					// https://github.com/neowutran/TeraDpsMeterData/tree/master/monsters
const TemplateID = [1000, 2000];	// 一阶王 二阶王
const {BossActionsTips} = require('./skillsList');
const BossName = ['ENTRADA', 'FAZE 01', 'FAZE 02'];

module.exports = function BaharrGuide(mod) {
	
	let {
		enabled,
		sendToAlert,
		sendToNotice,
		sendToMessage,
		itemsHelp,
		itemID1,								// 告示牌: 1一般布告栏, 2兴高采烈布告栏, 3狂人布告栏
		itemID2,								// 战利品: 古龍貝勒古斯的頭 (光柱), 369: 鑽石
		itemID3,								// 采集物: 445艾普罗
		itemID4									// 采集物: 912鸵鸟蛋
	} = require('./config.json');
	
	let isTank = true,
		insidemap = true,
		checkBoss = true,
		whichboss = 0,
		bossId = 0n,
		
		hooks = [],
		
		boss_CurLocation = null,
		boss_CurAngle = null,
		
		curLocation = null,
		curAngle = null,
		
		skill = null,
		skillid = null,
		
		shining = false,
		
		uid0 = 999999999n,
		uid1 = 899999999n,
		uid2 = 799999999n,
		
		timeOut = 0;
	
	mod.command.add(['巴哈', 'baha'], (arg) => {
		if (!arg) {
			enabled = !enabled;
			sendMessage('辅助提示 ' + (enabled ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
		} else {
			switch (arg) {
				case "a":
					sendToAlert = !sendToAlert;
					sendMessage('警告通知 ' + (sendToAlert ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					break;
				case "n":
					sendToNotice = !sendToNotice;
					sendMessage('队长通知 ' + (sendToNotice ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					break;
				case "p":
					sendToMessage = !sendToMessage;
					sendMessage('代理通知 ' + (sendToMessage ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					break;
				case "i":
					itemsHelp = !itemsHelp;
					sendMessage('地面提示 ' + (itemsHelp ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					break;
				case "debug":
					sendMessage('模块开关: ' + `${enabled}`.clr('00FFFF'));
					sendMessage('副本地图: ' + insidemap);
					sendMessage('副本首领: ' + whichboss);
					sendMessage('警告通知 ' + (sendToAlert ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					sendMessage('队长通知 ' + (sendToNotice ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					sendMessage('职业分类 ' + (isTank ? '坦克'.clr('00FFFF') : '打手'.clr('FF0000')));
					alertMessage('alertMessageTEST');
					noticeMessage('noticeMessageTEST');
					break;
				case "test1":
					TEST1();
					break;
				case "test2":
					TEST2();
					break;
				default :
					sendMessage('无效的参数!'.clr('FF0000'));
					break;
			}
		}
	});
	
	mod.hook('S_LOGIN', mod.majorPatchVersion >= 86 ? 14 : 13, (event) => {
		let job = (event.templateId - 10101) % 100;
		if (job === 1 || job === 10) {					// 0-双刀, 1-枪骑, 2-大剑, 3-斧头, 4-魔道
			isTank = true;								// 5-弓箭, 6-祭司, 7-元素, 8-飞镰, 9-魔工
		} else {										// 10-拳师, 11-忍者 12 月光
			isTank = false;
		}
	});
	
	mod.hook('S_LOAD_TOPO', 3, (event) => {
		if (event.zone === MapID) {
			insidemap = true;
			clearInterval(timeOut);
			load();
		} else {
			insidemap = false;
			shining = false;
			clearInterval(timeOut);
			TEST2();
			unload();
		}
    });
	
	mod.hook('S_SPAWN_ME', 3, (event) => {
		if (!enabled || !insidemap) return;
		setTimeout(() => {
			sendMessage('Bem Vindo a: ' + 'Bahaar\'s Rectum '.clr('56B4E9'));
			TEST1();
		}, 3000);
	});
	
	function load() {
		if (!hooks.length) {
			hook('S_ACTION_STAGE', 9, sActionStage);
			hook('S_ABNORMALITY_BEGIN', 3, sAbnormalityBegin);
			
			function sActionStage(event) {
				if (!enabled || !insidemap) return;
				
				if (event.stage > 0) return;
				
				/* 文本通知提示 */
				
				if (event.templateId == 2500) {
					curLocation = event.loc;
					curAngle = event.w;
					
					skill = event.skill.id % 1000;
					/*if (skill == 201) {
						alertMessage('LASER');
						return;
					}*/
					if (skill == 305) {
						noticeMessage('<font color="#FF0000">LASER firing</font>');
						if (itemsHelp) {
							Spawnitem1(itemID3, 180, 3000, 3000);
						}
						return;
					}
				}
				
				if (!(TemplateID.includes(event.templateId))) return;
				
				bossId = event.gameId;
				skillid = event.skill.id % 1000;
				
				if (BossActionsTips[skillid]) {
					noticeMessage(BossActionsTips[skillid].msg);
				}
				
				/* 地面范围提示 */
				
				switch (skillid)
				{
					case 121:	// 左脚→(4连火焰)
					case 122:
					case 123:
					case 140:	// 右脚←(4连火焰)
					case 141:
					case 142:
						timeOut = setTimeout(() => {
							/*mod.send('S_CHAT', 2, {
								channel: 25,
								authorName: 'Guide',
								message: 'Waves soon...'
							});*/
							
							alertMessage('Waves soon...');
						}, 60000);
						break;
				}
				
				if (!itemsHelp) return;
				
				boss_CurLocation = event.loc;
				boss_CurAngle = event.w;
				curLocation = boss_CurLocation;
				curAngle = boss_CurAngle;
				
				switch (skillid) {
					case 103:	// 前砸 103 104
					case 125:	// 右前砸 125 126 127
						SpawnThing(true, 184, 400, 100);
						Spawnitem2(itemID4, 8, 350, 3000);
						break;
						
					case 131:	// 左前砸 131 132 134
						SpawnThing(true, 182, 340, 100);
						Spawnitem2(itemID4, 8, 660, 4000);
						break;
						
					case 126:	// 右后拉 125 126 127
					case 132:	// 左后拉 131 132 134
						Spawnitem1(itemID4, 180, 500, 2000);	// 对称轴 头部
						Spawnitem1(itemID4, 0, 500, 2000);		// 对称轴 尾部
						if (skillid === 126) {
							SpawnThing(true, 90, 100, 100);		// 右后拉
						}
						if (skillid === 132) {
							SpawnThing(true, 180, 100, 100);	// 左后拉
						}
						Spawnitem1(itemID4, 180, 500, 2000);
						Spawnitem1(itemID4, 0, 500, 2000);
						break;
						
					case 112:	// 完美格挡
					case 135:
						SpawnThing(true, 184, 220, 100);
						Spawnitem2(itemID4, 12, 210, 4000);
						break;
						
					case 114:	// 捶地
						SpawnThing(true, 184, 260, 100);
						Spawnitem2(itemID4, 10, 320, 4000);
						break;
						
					case 116:	// 点名后甜甜圈
						Spawnitem2(itemID4, 8, 290, 6000);
						break;
						
					case 111:	// 后砸 (慢慢慢慢)
					case 137:	// 后砸
						SpawnThing(true, 0, 500, 100);
						Spawnitem2(itemID4, 8, 480, 2000);
						break;
						
					case 121:	// 左脚→(4连火焰)
					case 122:
					case 123:
					case 140:	// 右脚←(4连火焰)
					case 141:
					case 142:
						SpawnThing(true, 90, 50, 100);
						Spawnitem1(itemID4, 180, 500, 6000);
						Spawnitem1(itemID4, 0, 500, 6000);
						
						SpawnThing(true, 270, 100, 100);
						Spawnitem1(itemID4, 180, 500, 6000);
						Spawnitem1(itemID4, 0, 500, 6000);
						break;
						
					case 101:	// 锤地(三连击)
						Spawnitem1(itemID4, 345, 500, 3000);	// 对称轴 尾部
						Spawnitem1(itemID4, 270, 500, 3000);	// 对称轴 左侧
						break;
						
					case 311:	// 右手放锤
					case 312:	// 左手放锤
						Spawnitem1(itemID4, 180, 500, 6000);	// 对称轴 头部
						Spawnitem1(itemID4, 0, 500, 6000);		// 对称轴 尾部
						break;
						
					case 119:	// 光柱+告示牌
						SpawnThing(false, 270, 300, 2000);
						break;
					case 120:
						SpawnThing(false, 90, 300, 2000);
						break;
						
					default :
						break;
				}
			}
			
			function sAbnormalityBegin(event) {
				if (event.target !== bossId) return;
				
				if (event.id == 90442303) alertMessage('Healer should use [Regress] skill');
				if (event.id == 90442304) alertMessage('Stop the Boss using [Stun] skill');
				
				if (event.id == 90442000) shining = true;
				if (event.id == 90442001) shining = false;
				
				/* 发光后砸 技能判定机制 不稳定(不准确) */
				
				if (event.id == 90444001 && skillid == 104) setTimeout(() => { if (shining) noticeMessage('back hammer (next)'); }, 500);
				if (event.id == 90442000 && skillid == 134) setTimeout(() => { if (shining) noticeMessage('back hammer (next)'); }, 300);
				if (event.id == 90444001 && skillid == 118) setTimeout(() => { if (shining) noticeMessage('back hammer (next)'); }, 50);
			}
		}
	}
	
	/*function timestamp()
	{
		let today = new Date();
		return "[" + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds() + ":" + today.getMilliseconds() + "]";
	}*/
	
	function hook() {
		hooks.push(mod.hook(...arguments));
	}
	
	function unload() {
		if (hooks.length) {
			for (let h of hooks)
				mod.unhook(h);
			hooks = [];
		}
	}
	
	function alertMessage(msg) {
		if (sendToAlert) {
			mod.send('S_DUNGEON_EVENT_MESSAGE', 2, {
				type: 43,
				chat: 0,
				channel: 0,
				message: msg
			});
		}
	}
	
	function noticeMessage(msg) {
		if (sendToNotice) {
			mod.send('S_CHAT', 3, {
				channel: 21,
				name: 'Guide',
				message: msg
			});
		}
	}
	
	function sendMessage(msg) {
		mod.command.message(msg);
	}
	
	function TEST1() {
		mod.send('S_SPAWN_BUILD_OBJECT', 2, {
			gameId : 222222222n,
			itemId : 1,
			loc : new Vec3(-114567, 115063, 4022),
			w : 3,
			unk : 0,
			ownerName : 'Throne',
			message : 'Throne direction'
		});
	}
	
	function TEST2() {
		mod.send('S_DESPAWN_BUILD_OBJECT', 2, {
			gameId : 222222222n,
			unk : 0
		});
	}
	
	function SpawnThing(hide, degrees, radius, times) {
		let r = null, rads = null, finalrad = null;
		
		r = curAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		curLocation.x = boss_CurLocation.x + radius * Math.cos(finalrad); // chinese magic
		curLocation.y = boss_CurLocation.y + radius * Math.sin(finalrad);
		
		if(!hide)
		{
		mod.send('S_SPAWN_BUILD_OBJECT', 2, {
			gameId: uid1,
			itemId: itemID1,
			loc: curLocation,
			w: r,
			unk: 0,
			ownerName : 'SEGURO',
			message : 'SEGURO'
		});
		
		//if (hide) { curLocation.z = curLocation.z - 1000; }
		mod.send('S_SPAWN_DROPITEM', 8, {
			gameId: uid2,
			item: itemID2,
			loc: curLocation,
			amount: 1,
			expiry: 600000,
			owners: [{
				id: 0
			}],
			ownerName: "Bahaar"
		});
		//if (hide) { curLocation.z = curLocation.z + 1000; }
		
		setTimeout(DespawnThing, times, uid1, uid2);
		uid1--;
		uid2--;
		}
	}
	
	function DespawnThing(uid_arg1, uid_arg2) {
		mod.send('S_DESPAWN_BUILD_OBJECT', 2, {
			gameId: uid_arg1
			//unk : 0 // wtf since when it's gone hmmm ?
		});
		mod.send('S_DESPAWN_DROPITEM', 4, {
			gameId: uid_arg2
		});
	}
	
	function Spawnitem(item, degrees, radius, times) {
		let r = null, rads = null, finalrad = null, spawnx = null, spawny = null, pos = null;
		
		r = curAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		spawnx = curLocation.x + radius * Math.cos(finalrad);
		spawny = curLocation.y + radius * Math.sin(finalrad);
		pos = {x:spawnx, y:spawny, z:curLocation.z};
		
		mod.send('S_SPAWN_COLLECTION', 4, {
			gameId : uid0,
			id : item,
			amount : 1,
			loc : pos,
			w : r
		});
		
		setTimeout(Despawn, times, uid0);
		uid0--;
	}
	
	function Despawn(uid_arg0) {
		mod.send('S_DESPAWN_COLLECTION', 2, {
			gameId : uid_arg0
		});
	}
	
	function Spawnitem1(item, degrees, maxRadius, times) {
		for (var radius=50; radius<=maxRadius; radius+=50) {
			Spawnitem(item, degrees, radius, times);
		}
	}
	
	function Spawnitem2(item, intervalDegrees, radius, times) {
		for (var degrees=0; degrees<360; degrees+=intervalDegrees) {
			Spawnitem(item, degrees, radius, times);
		}
	}
	
}
