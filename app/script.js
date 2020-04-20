let health_bar, ammo_bar, enemies, plant, ship, powerups, shields, win_gfx, win_sfx, lose_gfx, number_gfx, multiplier_gfx, music, keys;
let score = 0;
let multiplier = { value: 1, frame_counter: 0 };

function bind_keys(keys) {
    window.addEventListener("keydown", (event) => {
        switch(event.key) {
            case "ArrowLeft":
                keys.right = false;
                keys.left = true;
                event.preventDefault();
                break;
            case "ArrowRight":
                keys.left = false;
                keys.right = true;
                event.preventDefault();
                break;
            case "ArrowUp":
                keys.thrust = true;
                event.preventDefault();
                break;
            case "z":
                if (!keys.shoot) {
                    keys.shoot = 12;
                }
                event.preventDefault();
                break;
        }
    }, true);
    window.addEventListener("keyup", (event) => {
        switch(event.key) {
            case "ArrowLeft":
                keys.left = false;
                event.preventDefault();
                break;
            case "ArrowRight":
                keys.right = false;
                event.preventDefault();
                break;
            case "ArrowUp":
                keys.thrust = false;
                event.preventDefault();
                break;
        }
    }, true);
}

function rand(len) {
    return Math.floor(Math.random() * len);
}

function load_bitmap_from_url({url, x = 0, y = 0} = {}) {
    return new Promise((resolve) => {
        const obj = {x, y};
        const img = new Image();
        img.src = url;
        img.addEventListener("load", (event) => {
            obj.canvas = document.createElement("canvas");
            obj.canvas.width = img.width;
            obj.canvas.height = img.height;
            obj.ctx = obj.canvas.getContext("2d");
            obj.ctx.drawImage(img, 0, 0);
            resolve(obj);
        }, true);
    });
}

function load_audio_from_url(url) {
    return new Promise((resolve) => {
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.addEventListener("loadeddata", (event) => {
            resolve({
                play: () => {
                    if (audio.currentTime > 0 && !audio.ended) {
                        audio.currentTime = 0;
                    }
                    audio.play();
                },
                stop: () => {
                    if (audio.currentTime > 0 && !audio.ended) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                },
                loop: () => {
                    audio.loop = true;
                    audio.play();
                },
                mute: () => {
                    audio.volume = 0.0;
                },
                set_volume: (level) => {
                    audio.volume = level / 100;
                },
            });
        }, true);
    });
}

function rotate(canvas, x, y, angle) {
    if (angle) {
        const rotated_canvas = document.createElement("canvas");
        rotated_canvas.width = canvas.width;
        rotated_canvas.height = canvas.height;
        const ctx = rotated_canvas.getContext("2d");
        ctx.translate(x, y);
        ctx.rotate(angle * Math.PI / 180);
        ctx.drawImage(canvas, -x, -y);
        return rotated_canvas;
    } else {
        return canvas;
    }
}

function draw(ctx, obj, x, y, {angle = 0} = {}) {
    ctx.drawImage(rotate(obj.canvas, obj.x, obj.y, angle), x - obj.x, y - obj.y);
}

function next_frame() {
    return new Promise((resolve) => {window.requestAnimationFrame(resolve)});
}

async function collide_fx() {
    const canvas = document.getElementById("display");
    canvas.style.borderColor = "yellow";
    setTimeout(() => {
        canvas.style.borderColor = null;
    }, 100);
}

function draw_pixel(image_data, x, y, col) {
    if (x >= 0 && x < image_data.width && y >= 0 && y < image_data.height) {
        const image_i = (y * image_data.width + x) * 4;
        image_data.data.set(col, image_i);
    }
}

function draw_extra_chunky_pixel(image_data, x, y, rgb) {
    const rgba = new Uint8Array([rgb[0], rgb[1], rgb[2], 255]);
    for (let dy = -2; dy < 3; dy++) {
        for (let dx = -2; dx < 3; dx++) {
            draw_pixel(image_data, x + dx, y + dy, rgba);
        }
    }
}

function draw_chunky_pixel(image_data, x, y, rgb) {
    const rgba = new Uint8Array([rgb[0], rgb[1], rgb[2], 255]);
    for (let dy = -1; dy < 2; dy++) {
        for (let dx = -1; dx < 2; dx++) {
            draw_pixel(image_data, x + dx, y + dy, rgba);
        }
    }
}

function draw_line(ctx, canvas_width, canvas_height, x, y, angle, enemies, shields, outer_col, inner_col) {
    const pos = [];
    const image_data = ctx.getImageData(0, 0, canvas_width, canvas_height);
    let i = 0
    while (true) {
        const dx = Math.floor(x - i * Math.sin((angle - 180) * Math.PI / 180.0));
        const dy = Math.floor(y + i * Math.cos((angle - 180) * Math.PI / 180.0));
        if (dx < 0 || dy < 0 || dx >= canvas_width || dy >= canvas_height) {
            break;
        }
        pos.push({x: dx, y: dy});
        i += 1;
    }
    pos.forEach(({x, y}) => {
        draw_extra_chunky_pixel(image_data, x, y, outer_col);
    });
    pos.forEach(({x, y}) => {
        draw_chunky_pixel(image_data, x, y, inner_col);
        enemies.pos.forEach((enemy) => {
            if (enemy.alive && Math.abs(x - enemy.x) < 16 && Math.abs(y - enemy.y) < 16) {
                score = Math.min(1000000000, score + 10 * multiplier.value);
                multiplier.frame_counter = 3 * 60;
                multiplier.value += 1;
                enemies.explosion_sfx.play();
                enemy.alive = false;
                enemy.exploding = true;
                enemy.frame = 0;
                enemy.frame_counter = 0;
                if (!rand(16)) {
                    shields.pos.push({
                        x: enemy.x,
                        y: enemy.y,
                        frame: 0,
                        frame_counter: 0,
                        cycles: 0,
                        active: true
                    });
                }
            }
        });
    });
    ctx.putImageData(image_data, 0, 0);
}

async function create_enemy() {
    return {};
}

function draw_hud(ctx, energy, shots, health_bar, ammo_bar) {
    draw(ctx, health_bar[3 - energy], 8, 8);
    draw(ctx, ammo_bar[7 - shots], 480 - 8, 8);
    draw_score(ctx);
}

function draw_plant(ctx, plant, stem_path) {
    ctx.drawImage(plant.gfx.canvas, 0, 768 - plant.growth, plant.gfx.canvas.width, 20 + plant.growth, 0, 768 - plant.growth, plant.gfx.canvas.width, 20 + plant.growth);
    plant.bulb_pos = { x: stem_path[plant.growth], y: 768 - plant.growth };
    if (plant.growth < 658) {
        draw(ctx, plant.bulb_gfx, plant.bulb_pos.x, plant.bulb_pos.y - 1);
    } else {
        draw(ctx, plant.flower_gfx, plant.bulb_pos.x, plant.bulb_pos.y);
    }
    if (plant.growth > 580) {
        ctx.drawImage(plant.leaves_gfx.canvas, 0, 768 - 590, plant.gfx.canvas.width, 20 + 590, 0, 768 - 590, plant.gfx.canvas.width, 20 + 590);
    } else if (plant.growth > 340) {
        ctx.drawImage(plant.leaves_gfx.canvas, 0, 768 - 400, plant.gfx.canvas.width, 20 + 400, 0, 768 - 400, plant.gfx.canvas.width, 20 + 400);
    } else if (plant.growth > 125) {
        ctx.drawImage(plant.leaves_gfx.canvas, 0, 768 - 145, plant.gfx.canvas.width, 20 + 145, 0, 768 - 145, plant.gfx.canvas.width, 20 + 145);
    }
}

function spawn_enemy(plant, enemies) {
    if (plant.growth < 658) {
        if (enemies.frame_counter == 180 - Math.min(enemies.pos.length * 5, 140)) {
            enemies.pos.push({
                x: 32 + rand(480 - 64),
                y: 0,
                alive: true,
                dest_x: rand(26) - 13,
                dest_y: rand(50) - 50,
                frame: 0,
                frame_counter: 0,
                exploding: false
            });
            enemies.frame_counter = 0;
        } else {
            enemies.frame_counter += 1;
        }
    }
}

function grow_plant(plant) {
    if (plant.growth < 658) {
        if (plant.frame_counter == 12) {
            plant.growth += 1;
            plant.frame_counter = 0;
        } else {
            plant.frame_counter += 1;
        }
    }
}

function move_enemies(ctx, plant, ship, enemies, shields) {
    enemies.pos.forEach((enemy) => {
        if (plant.growth == 658 && enemy.alive) {
            enemy.alive = false;
            enemy.exploding = true;
            enemy.frame = 0;
            enemy.frame_counter = 0;
        } else if (enemy.alive) {
            const dx = ship.x - enemy.x;
            const dy = ship.y - enemy.y;
            if (Math.sqrt(dx * dx + dy * dy) < 16 + 13) {
                enemies.explosion_sfx.play();
                if (ship.energy && !ship.shield_countdown) {
                    ship.energy -=1;
                }
                enemy.alive = false;
                enemy.exploding = true;
                enemy.frame = 0;
                enemy.frame_counter = 0;
            } else {
                const dest_x = plant.bulb_pos.x + enemy.dest_x;
                const dest_y = plant.bulb_pos.y + enemy.dest_y;
                const diff_x = Math.abs(dest_x - enemy.x);
                const diff_y = Math.abs(dest_y - enemy.y);
                if (diff_x > diff_y) {
                    if (diff_x != 0) {
                        enemy.x += 1;
                        if (enemy.x > dest_x) {
                            enemy.x = dest_x;
                        }
                    }
                    enemy.y += Math.floor(1 / (dest_y - enemy.y));
                } else {
                    if (diff_x != 0) {
                        enemy.x += Math.floor(1 / (dest_x - enemy.x));
                    }
                    if (diff_y != 0) {
                        enemy.y += 1;
                        if (enemy.y > dest_y) {
                            enemy.y = dest_y;
                        }
                    }
                }
                if (diff_x < 2 && diff_y < 2 && plant.frame_counter == 8) {
                    plant.growth = Math.max(plant.growth - 1, 0);
                    if (plant.growth == 0) {
                        ship.energy = 0;
                    }
                }
                draw(ctx, enemies.gfx[enemy.frame], enemy.x + rand(3) - 1, enemy.y - rand(3) - 1);
                if (enemy.frame_counter == 4) {
                    if (enemy.frame == enemies.gfx.length - 1) {
                        enemy.frame = 0;
                    } else {
                        enemy.frame += 1;
                    }
                    enemy.frame_counter = 0;
                } else {
                    enemy.frame_counter += 1;
                }
            }
        }
        if (enemy.exploding) {
            draw(ctx, enemies.explosion_gfx[enemy.frame], enemy.x, enemy.y);
            if (enemy.frame_counter == 4) {
                if (enemy.frame == enemies.explosion_gfx.length - 1) {
                    enemy.exploding = false;
                } else {
                    enemy.frame += 1;
                }
                enemy.frame_counter = 0;
            } else {
                enemy.frame_counter += 1;
            }
        }
    });
}

function move_ship(ctx, canvas_width, canvas_height, keys, ship, enemies, shields) {
    const dark_blue = [0, 0, 128];
    const blue = [255, 0, 0];
    const light_blue = [128, 128, 255];
    const light_magenta = [255, 128, 255];
    const white = [255, 255, 255];
    if (ship.energy) {
        if (keys.shoot == 12) {
            if (ship.shots) {
                ship.laser_sfx.play();
                ship.shots -= 1;
            } else {
                ship.no_laser_sfx.play();
                keys.shoot = 0;
            }
        }
        switch (keys.shoot) {
            case 12: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, dark_blue, blue); break;
            case 11: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, blue, light_blue); break;
            case 10: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, light_blue, light_magenta); break;
            case  9: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, light_magenta, white); break;
            case  8: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, light_magenta, white); break;
            case  7: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, light_magenta, white); break;
            case  6: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, light_magenta, white); break;
            case  5: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, light_magenta, white); break;
            case  4: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, light_magenta, white); break;
            case  3: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, light_blue, light_magenta); break;
            case  2: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, blue, light_blue); break;
            case  1: draw_line(ctx, canvas_width, canvas_height, ship.x, ship.y, ship.angle, enemies, shields, dark_blue, blue); break;
            default: break;
        }
    }
    if (keys.shoot) {
        keys.shoot -= 1;
    }
    ship.x += Math.floor(ship.velocity.x);
    ship.y += Math.floor(ship.velocity.y);
    if (ship.energy) {
        if (!ship.landed) {
            if (keys.right) {
                ship.angle += 3.6;
                if (ship.angle > 360.0) {
                    ship.angle -= 360.0;
                }
            } else if (keys.left) {
                ship.angle -= 3.6;
                if (ship.angle < 0.0) {
                    ship.angle += 360.0;
                }
            }
        }
    } else {
        ship.angle += 32.0 - 64.0 * Math.random();
    }
    if (ship.energy && keys.thrust) {
        ship.landed = false;
        ship.velocity.y -= 0.35 * Math.cos(ship.angle * Math.PI / 180.0);
        ship.velocity.x += 0.15 * Math.sin(ship.angle * Math.PI / 180.0);
    } else {
        if (ship.velocity.x > 0.005) {
            ship.velocity.x = Math.max(0.0, ship.velocity.x - 0.01);
        } else if (ship.velocity.x < -0.005) {
            ship.velocity.x = Math.min(0.0, ship.velocity.x + 0.01);
        }
    }
    if (ship.x < 16) {
        ship.x = 16;
        ship.velocity.x = Math.max(2.5, -ship.velocity.x + 0.05);
        if (ship.shield_countdown) {
            shields.hit_sfx.play();
        } else if (ship.energy) {
            ship.energy -=1;
            ship.hit_sfx.play();
        }
    } else if (ship.x >= 480 - 16) {
        ship.x = 480 - 16;
        ship.velocity.x = Math.min(-2.5, -ship.velocity.x - 0.05);
        if (ship.shield_countdown) {
            shields.hit_sfx.play();
        } else if (ship.energy) {
            ship.energy -=1;
            ship.hit_sfx.play();
        }
    }
    if (ship.y < 16) {
        ship.y = 16;
        ship.velocity.y = 2.5;
        if (ship.shield_countdown) {
            shields.hit_sfx.play();
        } else if (ship.energy) {
            ship.energy -=1;
            ship.hit_sfx.play();
        }
    } else if (ship.y > 768 - 16) {
        ship.y = 768 - 16;
        ship.velocity.y = Math.min(-2.5, -ship.velocity.y + 2.5);
        if (ship.shield_countdown) {
            shields.hit_sfx.play();
        } else if (ship.energy) {
            ship.energy -=1;
            ship.hit_sfx.play();
        }
    } else if (!ship.landed) {
        ship.velocity.y += 0.12;
    }
    if (ship.energy && keys.thrust) {
        ship.thrust_sfx.set_volume(50);
        switch (rand(2)) {
            case 0: draw(ctx, ship.burn_gfx[0], ship.x, ship.y, { angle: ship.angle }); break;
            case 1: draw(ctx, ship.burn_gfx[1], ship.x, ship.y, { angle: ship.angle }); break;
        }
    } else {
        ship.thrust_sfx.mute();
        draw(ctx, ship.gfx, ship.x, ship.y, { angle: ship.angle });
    }
    if (ship.shield_countdown) {
        draw(ctx, shields.gfx[ship.frame], ship.x, ship.y);
        if (ship.frame_counter == 4) {
            ship.frame_counter = 0;
            if (ship.frame == shields.gfx.length - 1) {
                ship.frame = 0;
            } else {
                ship.frame += 1;
            }
        }
        ship.frame_counter += 1;
        ship.shield_countdown -= 1;
        if (!ship.shield_countdown) {
            shields.loss_sfx.play();
        }
    }
}

function spawn_powerups(ctx, ship, powerups) {
    for (let i = 0; i < 4; i++) {
        const x = 60 + 120 * i;
        const y = 728;
        if (powerups.pos[i].alive) {
            const dx = ship.x - x;
            const dy = ship.y - y;
            if (ship.energy && Math.sqrt(dx * dx + dy * dy) < 16 + 24) {
                ship.shots = 7;
                powerups.pos[i].alive = false;
                powerups.pos[i].pickup = true;
                powerups.pos[i].frame = 0;
                powerups.pos[i].frame_counter = 0;
                powerups.sfx.play();
                score = Math.min(1000000000, score + 50 * multiplier.value);
            } else {
                draw(ctx, powerups.gfx[powerups.pos[i].frame], x, y);
                if (powerups.pos[i].frame_counter == 8) {
                    powerups.pos[i].frame_counter = 0;
                    if (powerups.pos[i].frame == powerups.gfx.length - 1) {
                        powerups.pos[i].frame = 0;
                    } else {
                        powerups.pos[i].frame += 1;
                    }
                } else {
                    powerups.pos[i].frame_counter += 1;
                }
            }
        }
        if (powerups.pos[i].pickup) {
            draw(ctx, powerups.pickup_gfx[powerups.pos[i].frame], x, y);
            if (powerups.pos[i].frame_counter == 3) {
                powerups.pos[i].frame_counter = 0;
                if (powerups.pos[i].frame == powerups.pickup_gfx.length - 1) {
                    powerups.pos[i].pickup = false;
                    powerups.pos[i].frame = 0;
                } else {
                    powerups.pos[i].frame += 1;
                }
            } else {
                powerups.pos[i].frame_counter += 1;
            }
        }
    }
    if (powerups.frame_counter == 8 * 60) {
        const i = rand(4);
        if (!powerups.pos[i].alive && !powerups.pos[i].pickup) {
            powerups.pos[i].alive = true;
        }
        powerups.frame_counter = 0;
    } else {
        powerups.frame_counter += 1;
    }
}

function update_shields(ctx, ship, shields) {
    shields.pos.forEach((shield) => {
        if (shield.active) {
            if (shield.cycles < 20 || shield.frame_counter % 2 == 0) {
                draw(ctx, shields.gfx[shield.frame], shield.x, shield.y);
            }
            const dx = ship.x - shield.x;
            const dy = ship.y - shield.y;
            if (ship.energy && Math.sqrt(dx * dx + dy * dy) < 32 + 24) {
                ship.shield_countdown = 10 * 60;
                shield.active = false;
                shields.pickup_sfx.play();
                score = Math.min(1000000000, score + 100 * multiplier.value);
            }
            if (shield.frame_counter == 4) {
                shield.frame_counter = 0;
                if (shield.frame == shields.gfx.length - 1) {
                    shield.frame = 0;
                    if (shield.cycles == 25) {
                        shield.active = false;
                    } else {
                        shield.cycles += 1;
                    }
                } else {
                    shield.frame += 1;
                }
            }
            shield.frame_counter += 1;
            if (shield.frame_counter % 2 == 0) {
                shield.y += 1;
            }
        }
    });
}

function calculate_stem_path(plant) {
    const image_data = plant.gfx.canvas.getContext("2d").getImageData(0, 0, plant.gfx.canvas.width, plant.gfx.canvas.height);
    const stem_path = [];
    for (let y = 0; y < 767; y++) {
        let min_x = 0, max_x = plant.gfx.canvas.width - 1;
        for (let x = 0; x < plant.gfx.canvas.width; x += 1) {
            const i = ((767 - y) * plant.gfx.canvas.width + x) * 4;
            if (image_data.data[i + 3]) {
                break;
            } else {
                min_x += 1;
            }
        }
        for (let x = plant.gfx.canvas.width - 1; x >= 0; x -= 1) {
            const i = ((767 - y) * plant.gfx.canvas.width + x) * 4;
            if (image_data.data[i + 3]) {
                break;
            } else {
                max_x -= 1;
            }
        }
        const x = Math.floor((min_x + max_x) / 2);
        stem_path.push(x);
    }
    return stem_path;
}

async function game(display) {
    const buffer = document.createElement("canvas");
    buffer.width = display.width;
    buffer.height = display.height;
    const ctx = buffer.getContext("2d");
    const display_ctx = display.getContext("2d");
    let game_over_counter = 575;
    music.loop();
    ship.thrust_sfx.mute();
    ship.thrust_sfx.loop();
    ship.laser_sfx.set_volume(25);
    const stem_path = calculate_stem_path(plant);
    while (game_over_counter) {
        ctx.clearRect(0, 0, buffer.width, buffer.height);
        draw_hud(ctx, ship.energy, ship.shots, health_bar, ammo_bar);
        draw_plant(ctx, plant, stem_path);
        spawn_enemy(plant, enemies);
        move_ship(ctx, buffer.width, buffer.height, keys, ship, enemies, shields);
        move_enemies(ctx, plant, ship, enemies, shields);
        spawn_powerups(ctx, ship, powerups);
        update_shields(ctx, ship, shields);
        if (plant.growth == 658) {
            draw(ctx, win_gfx, 240, 384);
            if (game_over_counter == 575) {
                score = Math.min(1000000000, score + 1000 * multiplier.value);
                win_sfx.play();
            }
            game_over_counter -= 1;
        } else if (!ship.energy) {
            draw(ctx, lose_gfx, 240, 384);
            if (game_over_counter == 575) {
                ship.explosion_sfx.play();
            }
            game_over_counter -= 1;
        }
        display_ctx.clearRect(0, 0, display.width, display.height);
        display_ctx.drawImage(buffer, 0, 0);
        await next_frame();
        grow_plant(plant);
    }
    music.stop();
    ship.thrust_sfx.stop();
}

function draw_score(ctx) {
    Array.from(String(Math.min(score, 1000000000)).padStart(10, "0")).forEach((char, i) => {
        ctx.drawImage(number_gfx[char.charCodeAt(0) - 48].canvas, 200 + i * 8, 10);
    }) ;
    if (multiplier.frame_counter) {
        ctx.drawImage(multiplier_gfx.canvas, 232, 18);
        Array.from(String(multiplier.value)).forEach((char, i) => {
            ctx.drawImage(number_gfx[char.charCodeAt(0) - 48].canvas, 240 + i * 8, 18);
        }) ;
        multiplier.frame_counter -= 1;
    } else {
        multiplier.value = 1;
    }
}

async function start_screen(display) {
    const ctx = display.getContext("2d");
    const gfx = await load_bitmap_from_url({url: "img/start_screen.png", x: 0, y: 0});
    draw(ctx, gfx, 0, 0);
    draw_score(ctx);
    while (!keys.shoot) {
        await next_frame();
    }
    keys.shoot = 0;
}

document.addEventListener("DOMContentLoaded", async () => {
    health_bar = [
        await load_bitmap_from_url({url: "img/health_bar_1.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/health_bar_2.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/health_bar_3.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/health_bar_4.png", x: 0, y: 0})
    ];
    ammo_bar = [
        await load_bitmap_from_url({url: "img/ammo_bar_1.png", x: 74, y: 0}),
        await load_bitmap_from_url({url: "img/ammo_bar_2.png", x: 74, y: 0}),
        await load_bitmap_from_url({url: "img/ammo_bar_3.png", x: 74, y: 0}),
        await load_bitmap_from_url({url: "img/ammo_bar_4.png", x: 74, y: 0}),
        await load_bitmap_from_url({url: "img/ammo_bar_5.png", x: 74, y: 0}),
        await load_bitmap_from_url({url: "img/ammo_bar_6.png", x: 74, y: 0}),
        await load_bitmap_from_url({url: "img/ammo_bar_7.png", x: 74, y: 0}),
        await load_bitmap_from_url({url: "img/ammo_bar_8.png", x: 74, y: 0})
    ];
    enemies = {
        gfx: [
            await load_bitmap_from_url({url: "img/germ_1.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/germ_2.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/germ_3.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/germ_4.png", x: 16, y: 16}),
        ],
        explosion_gfx: [
            await load_bitmap_from_url({url: "img/explosion_1.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/explosion_2.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/explosion_3.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/explosion_4.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/explosion_5.png", x: 16, y: 16}),
        ],
        explosion_sfx: await load_audio_from_url("sfx/enemy_explosion.ogg")
    };
    plant = {
        gfx: await load_bitmap_from_url({url: "img/stem.png", x: 0, y: 0}),
        leaves_gfx: await load_bitmap_from_url({url: "img/leaves.png", x: 0, y: 0}),
        bulb_gfx: await load_bitmap_from_url({url: "img/bulb.png", x: 13, y: 58}),
        flower_gfx: await load_bitmap_from_url({url: "img/flower.png", x: 234, y: 110})
    };
    ship = {
        gfx: await load_bitmap_from_url({url: "img/ship.png", x: 32, y: 21}),
        burn_gfx: [
            await load_bitmap_from_url({url: "img/ship_burn_1.png", x: 32, y: 21}),
            await load_bitmap_from_url({url: "img/ship_burn_2.png", x: 32, y: 21})
        ],
        laser_sfx: await load_audio_from_url("sfx/laser.ogg"),
        no_laser_sfx: await load_audio_from_url("sfx/no_laser.ogg"),
        hit_sfx: await load_audio_from_url("sfx/hit.ogg"),
        explosion_sfx: await load_audio_from_url("sfx/explosion.ogg"),
        thrust_sfx: await load_audio_from_url("sfx/thrust.ogg")
    };
    powerups = {
        gfx: [
            await load_bitmap_from_url({url: "img/regen_1.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/regen_2.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/regen_3.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/regen_4.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/regen_5.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/regen_6.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/regen_7.png", x: 16, y: 16})
        ],
        pickup_gfx: [
            await load_bitmap_from_url({url: "img/pickup_1.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/pickup_2.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/pickup_3.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/pickup_4.png", x: 16, y: 16}),
        ],
        sfx: await load_audio_from_url("sfx/powerup.ogg")
    };
    shields = {
        gfx: [
            await load_bitmap_from_url({url: "img/shield_1.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/shield_2.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/shield_3.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/shield_4.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/shield_5.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/shield_6.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/shield_7.png", x: 16, y: 16}),
            await load_bitmap_from_url({url: "img/shield_8.png", x: 16, y: 16})
        ],
        pickup_sfx: await load_audio_from_url("sfx/shield.ogg"),
        loss_sfx: await load_audio_from_url("sfx/shield_loss.ogg"),
        hit_sfx: await load_audio_from_url("sfx/shielded_hit.ogg"),
    };
    win_gfx = await load_bitmap_from_url({url: "img/win.png", x: 124, y: 6});
    win_sfx = await load_audio_from_url("sfx/win.ogg");
    lose_gfx = await load_bitmap_from_url({url: "img/lose.png", x: 140, y: 14});
    number_gfx = [
        await load_bitmap_from_url({url: "img/number_0.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_1.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_2.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_3.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_4.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_5.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_6.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_7.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_8.png", x: 0, y: 0}),
        await load_bitmap_from_url({url: "img/number_9.png", x: 0, y: 0}),
    ];
    multiplier_gfx = await load_bitmap_from_url({url: "img/multiplier.png", x: 0, y: 0});
    music = await load_audio_from_url("music/flower_stem.ogg");
    keys = {
        left: false,
        right: false,
        thrust: false,
        shoot: 0
    };
    try {
        bind_keys(keys);
        while (true) {
            await start_screen(document.getElementById("display"));
            enemies.pos = [];
            enemies.frame_counter = 0;
            plant.growth = 0;
            plant.frame_counter = 0;
            ship.landed = true;
            ship.x = 240;
            ship.y = 728;
            ship.angle = 0;
            ship.velocity = { x: 0, y: 0 };
            ship.energy = 3;
            ship.shots = 7;
            ship.frame = 0;
            ship.frame_counter = 0;
            ship.shield_countdown = 0;
            powerups.pos = [
                { alive: false, pickup: false, frame_counter: 0, frame: 0 },
                { alive: false, pickup: false, frame_counter: 0, frame: 0 },
                { alive: false, pickup: false, frame_counter: 0, frame: 0 },
                { alive: false, pickup: false, frame_counter: 0, frame: 0 }
            ];
            powerups.frame_counter = 0;
            shields.pos = [];
            score = 0;
            multiplier = { value: 1, frame_counter: 0 };
            await game(document.getElementById("display"));
        }
    } catch (e) {
        console.error(e);
    }
}, true);
